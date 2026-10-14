import json
import os
import uuid
from datetime import datetime, timezone

import boto3
from boto3.dynamodb.conditions import Key

from common.utils import (
    build_response,
    extract_claims,
    is_admin,
    normalize_booking,
    parse_floats_to_decimals,
)

dynamodb = boto3.resource("dynamodb")
bookings_table_name = os.environ.get("BOOKINGS_TABLE_NAME", "CarRentalBookings")
cars_table_name = os.environ.get("CARS_TABLE_NAME", "CarRentalCars")
notifications_table_name = os.environ.get("NOTIFICATIONS_TABLE_NAME", "CarRentalNotifcations")
content_table_name = os.environ.get("CONTENT_TABLE_NAME")

bookings_table = dynamodb.Table(bookings_table_name)
cars_table = dynamodb.Table(cars_table_name)
notifications_table = dynamodb.Table(notifications_table_name)
content_table = dynamodb.Table(content_table_name) if content_table_name else None


def _notify(user_id, title, message, ntype="BOOKING"):
    try:
        notifications_table.put_item(
            Item={
                "notificationId": f"noti_{uuid.uuid4().hex[:10]}",
                "userId": user_id,
                "title": title,
                "message": message,
                "type": ntype,
                "read": False,
                "createdAt": datetime.now(timezone.utc).isoformat(),
            }
        )
    except Exception as e:
        print(f"Failed writing notification: {e}")


def _car_name(car):
    return f"{car.get('brand') or car.get('make', '')} {car.get('model', '')}".strip()


def _promotion_discount(car_id, pickup_date, eligible_amount):
    if not content_table:
        return 0.0

    response = content_table.query(
        IndexName="ContentTypeCreatedAtIndex",
        KeyConditionExpression=Key("type").eq("DISCOUNT"),
    )
    promotions = response.get("Items", [])
    while response.get("LastEvaluatedKey"):
        response = content_table.query(
            IndexName="ContentTypeCreatedAtIndex",
            KeyConditionExpression=Key("type").eq("DISCOUNT"),
            ExclusiveStartKey=response["LastEvaluatedKey"],
        )
        promotions.extend(response.get("Items", []))

    eligible_rates = [
        float(promotion.get("percentOff", 0))
        for promotion in promotions
        if promotion.get("published") is True
        and promotion.get("carId") == car_id
        and (not promotion.get("startDate") or promotion["startDate"][:10] <= pickup_date[:10])
        and (not promotion.get("endDate") or promotion["endDate"][:10] >= pickup_date[:10])
    ]
    if not eligible_rates:
        return 0.0
    return round(eligible_amount * max(eligible_rates) / 100, 2)


def _is_overlap(bookings, pickup_date, return_date, exclude_booking_id=None):
    """True if any booking in the supplied list overlaps the requested range."""
    for b in bookings:
        if exclude_booking_id and b.get("bookingId") == exclude_booking_id:
            continue
        if b.get("status") in ("CANCELLED", "REJECTED", "NO-SHOW"):
            continue
        b_pickup = b.get("pickupDate") or b.get("startDate", "")
        b_return = b.get("returnDate") or b.get("endDate", "")
        if not b_pickup or not b_return:
            continue
        if b_pickup < return_date and pickup_date < b_return:
            return True
    return False


def handler(event, context):
    http_method = event.get("httpMethod", "").upper()
    path_parameters = event.get("pathParameters") or {}
    param_id = path_parameters.get("bookingId") or path_parameters.get("userId")

    if http_method == "OPTIONS":
        return build_response(200, {"message": "OK"})

    user_info = extract_claims(event)
    if not user_info.get("userId"):
        return build_response(401, {"message": "Unauthorized: Missing identity token claims"})

    try:
        if http_method == "GET":
            if param_id:
                if param_id.startswith("book_"):
                    return get_booking(param_id, user_info)
                return list_bookings(user_info, target_user_id=param_id)
            return list_bookings(user_info)

        elif http_method == "POST":
            return create_booking(event, user_info)

        elif http_method == "PUT" and param_id:
            return update_booking(param_id, event, user_info)

        elif http_method == "DELETE" and param_id:
            return cancel_booking(param_id, user_info)

        return build_response(400, {"message": f"Unsupported method or path: {http_method}"})

    except Exception as e:
        print(f"Error handling booking: {str(e)}")
        return build_response(500, {"message": str(e)})


def list_bookings(user_info, target_user_id=None):
    if is_admin(user_info) and not target_user_id:
        response = bookings_table.scan()
        items = [normalize_booking(b) for b in response.get("Items", [])]
        items.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
        return build_response(200, items)

    uid = target_user_id or user_info["userId"]
    if uid != user_info["userId"] and not is_admin(user_info):
        return build_response(403, {"message": "Forbidden: Cannot access another user's bookings"})

    response = bookings_table.query(
        IndexName="UserBookingsIndex",
        KeyConditionExpression=Key("userId").eq(uid),
    )
    items = [normalize_booking(b) for b in response.get("Items", [])]
    items.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    return build_response(200, items)


def get_booking(booking_id, user_info):
    response = bookings_table.get_item(Key={"bookingId": booking_id})
    item = response.get("Item")
    if not item:
        return build_response(404, {"message": f"Booking '{booking_id}' not found"})

    if item.get("userId") != user_info["userId"] and not is_admin(user_info):
        return build_response(403, {"message": "Forbidden: Access denied"})

    return build_response(200, normalize_booking(item))


def create_booking(event, user_info):
    # Administrators manage the fleet; they cannot book cars as customers.
    if is_admin(user_info):
        return build_response(
            403,
            {"message": "Forbidden: Administrators manage the fleet and cannot book cars"},
        )

    body = json.loads(event.get("body") or "{}")
    car_id = body.get("carId")
    pickup_date = body.get("pickupDate") or body.get("startDate")
    return_date = body.get("returnDate") or body.get("endDate")

    if not car_id or not pickup_date or not return_date:
        return build_response(
            400,
            {"message": "Missing required fields: carId, pickupDate, returnDate"},
        )
    if return_date <= pickup_date:
        return build_response(400, {"message": "Return date must be after pickup date"})

    car_resp = cars_table.get_item(Key={"carId": car_id})
    car = car_resp.get("Item")
    if not car:
        return build_response(404, {"message": f"Car '{car_id}' not found"})

    is_available = car.get("available", car.get("isAvailable", True))
    if not is_available:
        return build_response(400, {"message": "This car is currently unavailable"})

    existing = bookings_table.query(
        IndexName="CarBookingsIndex",
        KeyConditionExpression=Key("carId").eq(car_id),
    ).get("Items", [])
    if _is_overlap(existing, pickup_date, return_date):
        return build_response(409, {"message": "Car is already booked for those dates"})

    daily_rate = car.get("pricePerDay") if "pricePerDay" in car else car.get("dailyRate", 50)
    try:
        p_dt = datetime.fromisoformat(pickup_date.replace("Z", "+00:00"))
        r_dt = datetime.fromisoformat(return_date.replace("Z", "+00:00"))
        days = max(1, (r_dt - p_dt).days)
    except Exception:
        days = 1

    base_price = days * float(daily_rate)
    add_charges = float(car.get("additionalCharges", 0) or 0)
    deposit = float(car.get("deposit", 0) or 0)
    discount = _promotion_discount(car_id, pickup_date, base_price + add_charges)
    total_amount = max(0, base_price + add_charges - discount + deposit)

    booking_id = f"book_{uuid.uuid4().hex[:12]}"
    created_at = datetime.now(timezone.utc).isoformat()

    booking_item = {
        "bookingId": booking_id,
        "userId": user_info["userId"],
        "userEmail": user_info.get("email", ""),
        "carId": car_id,
        "carName": _car_name(car) or car_id,
        "pickupDate": pickup_date,
        "startDate": pickup_date,
        "returnDate": return_date,
        "endDate": return_date,
        "pickupTime": body.get("pickupTime", "10:00"),
        "returnTime": body.get("returnTime", "10:00"),
        "pickupLocation": body.get("pickupLocation", "Douala"),
        "returnLocation": body.get("returnLocation", body.get("pickupLocation", "Douala")),
        "rentalDays": days,
        "basePrice": base_price,
        "additionalCharges": add_charges,
        "discount": discount,
        "deposit": deposit,
        "totalPrice": total_amount,
        "totalAmount": total_amount,
        "paymentStatus": "UNPAID",
        "status": "PENDING",
        "createdAt": created_at,
    }
    bookings_table.put_item(Item=parse_floats_to_decimals(booking_item))

    _notify(
        user_info["userId"],
        "Booking requested",
        f"Your rental of {booking_item['carName']} from {pickup_date} to {return_date} is pending payment.",
        ntype="BOOKING",
    )

    return build_response(201, normalize_booking(booking_item))


def update_booking(booking_id, event, user_info):
    """Owner may modify PENDING bookings; admins manage status transitions."""
    body = json.loads(event.get("body") or "{}")
    resp = bookings_table.get_item(Key={"bookingId": booking_id})
    existing = resp.get("Item")
    if not existing:
        return build_response(404, {"message": f"Booking '{booking_id}' not found"})

    is_owner = existing.get("userId") == user_info["userId"]
    if not is_owner and not is_admin(user_info):
        return build_response(403, {"message": "Forbidden: Cannot update another user's booking"})

    if "status" in body and is_admin(user_info):
        new_status = body["status"].upper()
        allowed = {"CONFIRMED", "ACTIVE", "COMPLETED", "NO-SHOW", "REJECTED"}
        if new_status not in allowed:
            return build_response(400, {"message": f"Invalid status '{new_status}'"})
        existing["status"] = new_status
        if new_status == "CANCELLED":
            existing["paymentStatus"] = (
                "REFUNDED" if existing.get("paymentStatus") == "PAID" else "UNPAID"
            )
        _notify(
            existing.get("userId"),
            f"Booking {new_status}",
            f"Your booking {booking_id} status is now {new_status}.",
            ntype="BOOKING",
        )

    if (
        "pickupDate" in body
        or "returnDate" in body
        or "pickupLocation" in body
        or "returnLocation" in body
    ):
        if not is_owner:
            return build_response(
                403, {"message": "Only the booking owner can modify booking details"}
            )
        if existing.get("status") != "PENDING":
            return build_response(
                400, {"message": "Only pending bookings can be modified"}
            )

        new_pickup = body.get("pickupDate", existing.get("pickupDate"))
        new_return = body.get("returnDate", existing.get("returnDate"))
        if new_return <= new_pickup:
            return build_response(400, {"message": "Return date must be after pickup date"})

        others = bookings_table.query(
            IndexName="CarBookingsIndex",
            KeyConditionExpression=Key("carId").eq(existing.get("carId")),
        ).get("Items", [])
        if _is_overlap(others, new_pickup, new_return, exclude_booking_id=booking_id):
            return build_response(409, {"message": "Car is already booked for those dates"})

        existing["pickupDate"] = new_pickup
        existing["startDate"] = new_pickup
        existing["returnDate"] = new_return
        existing["endDate"] = new_return
        if "pickupTime" in body:
            existing["pickupTime"] = body["pickupTime"]
        if "returnTime" in body:
            existing["returnTime"] = body["returnTime"]
        if "pickupLocation" in body:
            existing["pickupLocation"] = body["pickupLocation"]
        if "returnLocation" in body:
            existing["returnLocation"] = body["returnLocation"]

        car_resp = cars_table.get_item(Key={"carId": existing.get("carId")})
        car = car_resp.get("Item") or {}
        daily_rate = car.get("pricePerDay") if "pricePerDay" in car else car.get("dailyRate", 50)
        try:
            pd = datetime.fromisoformat(new_pickup.replace("Z", "+00:00"))
            rd = datetime.fromisoformat(new_return.replace("Z", "+00:00"))
            days = max(1, (rd - pd).days)
        except Exception:
            days = existing.get("rentalDays", 1)

        base = days * float(daily_rate)
        existing["rentalDays"] = days
        existing["basePrice"] = base
        existing["totalPrice"] = max(
            0,
            base
            + existing.get("additionalCharges", 0)
            - existing.get("discount", 0)
            + existing.get("deposit", 0),
        )
        existing["totalAmount"] = existing["totalPrice"]

        _notify(
            existing.get("userId"),
            "Booking modified",
            f"Your booking {booking_id} was updated. New total: {existing['totalAmount']}",
            ntype="BOOKING",
        )

    bookings_table.put_item(Item=parse_floats_to_decimals(existing))
    return build_response(200, normalize_booking(existing))


def cancel_booking(booking_id, user_info):
    resp = bookings_table.get_item(Key={"bookingId": booking_id})
    existing = resp.get("Item")
    if not existing:
        return build_response(404, {"message": f"Booking '{booking_id}' not found"})

    if existing.get("userId") != user_info["userId"] and not is_admin(user_info):
        return build_response(403, {"message": "Forbidden: Cannot cancel another user's booking"})

    if existing.get("status") in ("COMPLETED", "CANCELLED", "NO-SHOW"):
        return build_response(
            400, {"message": f"Cannot cancel booking in status '{existing.get('status')}'"}
        )

    existing["status"] = "CANCELLED"
    existing["paymentStatus"] = (
        "REFUNDED" if existing.get("paymentStatus") == "PAID" else "UNPAID"
    )
    bookings_table.put_item(Item=parse_floats_to_decimals(existing))

    _notify(
        existing.get("userId"),
        "Booking cancelled",
        f"Your booking {booking_id} has been cancelled.",
        ntype="BOOKING",
    )

    return build_response(
        200,
        {
            "message": f"Booking '{booking_id}' has been cancelled",
            "booking": normalize_booking(existing),
        },
    )