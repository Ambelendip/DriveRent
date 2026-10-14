import json
import os
import uuid
from datetime import datetime, timezone

import boto3
from boto3.dynamodb.conditions import Key

from common.utils import build_response, extract_claims, is_admin, parse_floats_to_decimals

dynamodb = boto3.resource("dynamodb")
table_name = os.environ.get("REVIEWS_TABLE_NAME", "CarRentalReviews")
bookings_table_name = os.environ.get("BOOKINGS_TABLE_NAME", "CarRentalBookings")
table = dynamodb.Table(table_name)
bookings_table = dynamodb.Table(bookings_table_name)


def handler(event, context):
    http_method = event.get("httpMethod", "").upper()
    path_parameters = event.get("pathParameters") or {}
    # The /reviews/{itemId} route passes the id in the itemId path part.
    # Review ids are prefixed with "rev_"; anything else is a carId.
    item_id = path_parameters.get("itemId") or path_parameters.get("reviewId") or path_parameters.get("carId")
    review_id = item_id if item_id and item_id.startswith("rev_") else None
    car_id = item_id if item_id and not item_id.startswith("rev_") else None

    if http_method == "OPTIONS":
        return build_response(200, {"message": "OK"})

    # Public GET: list reviews for a car (no auth required)
    if http_method == "GET" and car_id:
        return list_reviews_for_car(car_id)

    user_info = extract_claims(event)
    if not user_info.get("userId"):
        return build_response(401, {"message": "Unauthorized: Missing identity token claims"})

    try:
        if http_method == "POST":
            return create_review(event, user_info)
        if http_method == "DELETE" and (review_id or (car_id and car_id.startswith("rev_"))):
            delete_id = review_id or car_id
            return delete_review(delete_id, user_info)
        if http_method == "GET" and review_id:
            return get_review(review_id, user_info)

        return build_response(400, {"message": f"Unsupported method or path: {http_method}"})
    except Exception as e:
        print(f"Error handling review: {str(e)}")
        return build_response(500, {"message": str(e)})


def create_review(event, user_info):
    """Customers may review a car only after a COMPLETED rental of that car."""
    body = json.loads(event.get("body") or "{}")
    car_id = body.get("carId")
    rating = body.get("rating")
    comment = body.get("comment", "")

    if not car_id:
        return build_response(400, {"message": "Field 'carId' is required"})
    try:
        rating = int(rating)
    except (TypeError, ValueError):
        return build_response(400, {"message": "Rating must be a number"})
    if rating < 1 or rating > 5:
        return build_response(400, {"message": "Rating must be between 1 and 5"})

    # Verify completed booking for this car
    active = None
    try:
        active = bookings_table.query(
            IndexName="UserBookingsIndex",
            KeyConditionExpression=Key("userId").eq(user_info["userId"]),
        ).get("Items", [])
    except Exception as e:
        print(f"Failed to query bookings for review check: {e}")

    completed = [
        b
        for b in (active or [])
        if b.get("carId") == car_id and b.get("status") == "COMPLETED"
    ]
    if not completed and not is_admin(user_info):
        return build_response(
            403,
            {"message": "You can only review a car after completing a rental of it"},
        )

    review_id = f"rev_{uuid.uuid4().hex[:12]}"
    created_at = datetime.now(timezone.utc).isoformat()
    item = {
        "reviewId": review_id,
        "carId": car_id,
        "userId": user_info["userId"],
        "userName": user_info.get("claims", {}).get("name", "") or user_info.get("email", ""),
        "rating": rating,
        "comment": comment,
        "createdAt": created_at,
    }
    table.put_item(Item=parse_floats_to_decimals(item))
    return build_response(201, item)


def list_reviews_for_car(car_id):
    response = table.query(
        IndexName="CarReviewsIndex",
        KeyConditionExpression=Key("carId").eq(car_id),
        ScanIndexForward=False,
    )
    items = response.get("Items", [])
    avg = 0
    if items:
        avg = round(sum(i.get("rating", 0) for i in items) / len(items), 1)
    return build_response(200, {"reviews": items, "averageRating": avg, "count": len(items)})


def get_review(review_id, user_info):
    response = table.get_item(Key={"reviewId": review_id})
    item = response.get("Item")
    if not item:
        return build_response(404, {"message": "Review not found"})
    return build_response(200, item)


def delete_review(review_id, user_info):
    response = table.get_item(Key={"reviewId": review_id})
    item = response.get("Item")
    if not item:
        return build_response(404, {"message": "Review not found"})
    if item.get("userId") != user_info["userId"] and not is_admin(user_info):
        return build_response(403, {"message": "Forbidden: Cannot delete this review"})
    table.delete_item(Key={"reviewId": review_id})
    return build_response(200, {"message": "Review deleted"})