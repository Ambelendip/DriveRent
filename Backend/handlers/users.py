import json
import os
import uuid
from datetime import datetime, timezone

import boto3
from boto3.dynamodb.conditions import Key

from common.utils import build_response, extract_claims, is_admin, parse_floats_to_decimals

dynamodb = boto3.resource("dynamodb")
table_name = os.environ.get("USERS_TABLE_NAME", "CarRentalUsers")
bookings_table_name = os.environ.get("BOOKINGS_TABLE_NAME", "CarRentalBookings")
payments_table_name = os.environ.get("PAYMENTS_TABLE_NAME", "CarRentalPayments")

table = dynamodb.Table(table_name)
bookings_table = dynamodb.Table(bookings_table_name)
payments_table = dynamodb.Table(payments_table_name)


def _now():
    return datetime.now(timezone.utc).isoformat()


def _default_profile(user_id, user_info, existing=None):
    claims = user_info.get("claims", {})
    reg_date = existing.get("registationDate") if existing else None
    return {
        "userId": user_id,
        "email": user_info.get("email", ""),
        "firstName": claims.get("given_name", ""),
        "lastName": claims.get("family_name", ""),
        "name": (claims.get("name") or f"{claims.get('given_name','')} {claims.get('family_name','')}".strip()),
        "phone": user_info.get("claims", {}).get("phone_number", ""),
        "dateOfBirth": "",
        "address": "",
        "city": "",
        "country": "",
        "role": user_info.get("role", "CUSTOMER"),
        "accountStatus": "ACTIVE",
        "registrationDate": reg_date or _now(),
        "lastLogin": _now(),
        "totalBookings": 0,
        "completedRentals": 0,
        "location": "",
        "bio": "",
    }


def _enrich_user_stats(profile):
    """Compute booking totals directly from the bookings table."""
    try:
        resp = bookings_table.query(
            IndexName="UserBookingsIndex",
            KeyConditionExpression=Key("userId").eq(profile["userId"]),
        )
        bookings = resp.get("Items", [])
        profile["totalBookings"] = len(bookings)
        profile["completedRentals"] = sum(
            1 for b in bookings if b.get("status") == "COMPLETED"
        )
    except Exception as e:
        print(f"Failed enriching user stats: {e}")
        profile.setdefault("totalBookings", 0)
        profile.setdefault("completedRentals", 0)
    return profile


def handler(event, context):
    http_method = event.get("httpMethod", "").upper()
    path_parameters = event.get("pathParameters") or {}
    user_id = path_parameters.get("userId")

    if http_method == "OPTIONS":
        return build_response(200, {"message": "OK"})

    user_info = extract_claims(event)
    claims_user_id = user_info.get("userId")
    if not claims_user_id:
        return build_response(401, {"message": "Unauthorized: Missing authentication claims"})

    try:
        # --- Admin customer management routes ---
        if user_id and not user_id == "me":
            if not is_admin(user_info):
                return build_response(403, {"message": "Forbidden: Admin access required"})
            if http_method == "GET":
                return get_profile_for_admin(user_id)
            if http_method == "PUT":
                return update_profile_for_admin(user_id, event)

        # --- Admin list all users: GET /users ---
        if not user_id and http_method == "GET" and is_admin(user_info):
            return admin_list_users()

        # --- Self profile routes ---
        if http_method == "GET":
            return get_my_profile(claims_user_id, user_info)
        if http_method == "PUT":
            return update_my_profile(claims_user_id, user_info, event)

        return build_response(400, {"message": f"Unsupported method: {http_method}"})
    except Exception as e:
        print(f"Error handling profile: {str(e)}")
        return build_response(500, {"message": str(e)})


def get_my_profile(claims_user_id, user_info):
    response = table.get_item(Key={"userId": claims_user_id})
    profile = response.get("Item")

    if not profile:
        profile = _default_profile(claims_user_id, user_info)
        table.put_item(Item=parse_floats_to_decimals(profile))

    # Update lastLogin on each profile GET
    profile["lastLogin"] = _now()
    table.put_item(Item=parse_floats_to_decimals(profile))

    return build_response(200, _enrich_user_stats(profile))


def update_my_profile(claims_user_id, user_info, event):
    body = json.loads(event.get("body") or "{}")
    response = table.get_item(Key={"userId": claims_user_id})
    profile = response.get("Item") or _default_profile(claims_user_id, user_info)

    for field in [
        "name",
        "firstName",
        "lastName",
        "phone",
        "dateOfBirth",
        "address",
        "city",
        "country",
        "location",
        "bio",
    ]:
        if field in body:
            profile[field] = body[field]

    table.put_item(Item=parse_floats_to_decimals(profile))
    return build_response(200, _enrich_user_stats(profile))


def get_profile_for_admin(target_user_id):
    response = table.get_item(Key={"userId": target_user_id})
    profile = response.get("Item")
    if not profile:
        return build_response(404, {"message": "User not found"})
    return build_response(200, _admin_user_summary(_enrich_user_stats(profile)))


def update_profile_for_admin(target_user_id, event):
    body = json.loads(event.get("body") or "{}")
    response = table.get_item(Key={"userId": target_user_id})
    profile = response.get("Item")
    if not profile:
        return build_response(404, {"message": "User not found"})

    for field in ["accountStatus", "role", "name", "firstName", "lastName", "phone", "address", "city", "country"]:
        if field in body:
            profile[field] = body[field]

    table.put_item(Item=parse_floats_to_decimals(profile))
    return build_response(200, _enrich_user_stats(profile))


def admin_list_users():
    response = table.scan()
    items = [
        _admin_user_summary(_enrich_user_stats(profile))
        for profile in response.get("Items", [])
    ]
    items.sort(key=lambda x: x.get("registrationDate", ""), reverse=True)
    return build_response(200, items)


def _admin_user_summary(profile):
    allowed_fields = (
        "userId",
        "email",
        "name",
        "firstName",
        "lastName",
        "city",
        "country",
        "registrationDate",
        "totalBookings",
        "completedRentals",
        "accountStatus",
    )
    return {field: profile[field] for field in allowed_fields if field in profile}