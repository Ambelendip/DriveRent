import json
import os
import uuid
from datetime import datetime, timezone

import boto3
from boto3.dynamodb.conditions import Key

from common.utils import build_response, extract_claims, is_admin, parse_floats_to_decimals

dynamodb = boto3.resource("dynamodb")
payments_table_name = os.environ.get("PAYMENTS_TABLE_NAME", "CarRentalPayments")
bookings_table_name = os.environ.get("BOOKINGS_TABLE_NAME", "CarRentalBookings")
notifications_table_name = os.environ.get("NOTIFICATIONS_TABLE_NAME", "CarRentalNotifcations")
users_table_name = os.environ.get("USERS_TABLE_NAME", "CarRentalUsers")

payments_table = dynamodb.Table(payments_table_name)
bookings_table = dynamodb.Table(bookings_table_name)
notifications_table = dynamodb.Table(notifications_table_name)
users_table = dynamodb.Table(users_table_name)


def _put_notification(user_id, title, message, ntype="BOOKING"):
    nid = f"noti_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()
    try:
        notifications_table.put_item(
            Item={
                "notificationId": nid,
                "userId": user_id,
                "title": title,
                "message": message,
                "type": ntype,
                "read": False,
                "createdAt": now,
            }
        )
    except Exception as e:
        print(f"Failed writing notification: {e}")


def handler(event, context):
    http_method = event.get("httpMethod", "").upper()
    path_parameters = event.get("pathParameters") or {}
    payment_id = path_parameters.get("paymentId")

    if http_method == "OPTIONS":
        return build_response(200, {"message": "OK"})

    user_info = extract_claims(event)
    if not user_info.get("userId"):
        return build_response(401, {"message": "Unauthorized: Missing identity token claims"})

    try:
        if http_method == "POST":
            return create_payment(event, user_info)
        if http_method == "GET":
            if payment_id:
                return get_payment(payment_id, user_info)
            return list_payments(user_info)
        if http_method == "PUT" and payment_id:
            return update_payment(payment_id, event, user_info)

        return build_response(400, {"message": f"Unsupported method or path: {http_method}"})
    except Exception as e:
        print(f"Error handling payment: {str(e)}")
        return build_response(500, {"message": str(e)})


def create_payment(event, user_info):
    """Simulated payment: marks payment SUCCESSFUL and booking CONFIRMED."""
    body = json.loads(event.get("body") or "{}")
    booking_id = body.get("bookingId")
    if not booking_id:
        return build_response(400, {"message": "Field 'bookingId' is required"})

    booking_resp = bookings_table.get_item(Key={"bookingId": booking_id})
    booking = booking_resp.get("Item")
    if not booking:
        return build_response(404, {"message": f"Booking '{booking_id}' not found"})

    if booking.get("userId") != user_info["userId"] and not is_admin(user_info):
        return build_response(403, {"message": "Forbidden: Cannot pay for another user's booking"})

    if booking.get("status") not in ("PENDING",):
        return build_response(400, {"message": f"Payment not allowed for booking status '{booking.get('status')}'"})

    if booking.get("paymentStatus") == "PAID":
        return build_response(400, {"message": "Booking already paid"})

    method = body.get("method", "card").upper()
    currency = body.get("currency", "XAF")
    amount = booking.get("totalAmount", booking.get("totalPrice", 0))

    payment_id = f"pay_{uuid.uuid4().hex[:12]}"
    txn_ref = f"TXN-{uuid.uuid4().hex[:10].upper()}"
    created_at = datetime.now(timezone.utc).isoformat()

    payment_item = {
        "paymentId": payment_id,
        "bookingId": booking_id,
        "userId": user_info["userId"],
        "userEmail": user_info.get("email", ""),
        "carId": booking.get("carId", ""),
        "amount": amount,
        "currency": currency,
        "method": method,
        "status": "SUCCESSFUL",
        "type": "RENTAL",
        "transactionRef": txn_ref,
        "createdAt": created_at,
    }
    payments_table.put_item(Item=parse_floats_to_decimals(payment_item))

    booking["paymentStatus"] = "PAID"
    booking["status"] = "CONFIRMED"
    booking["paymentId"] = payment_id
    bookings_table.put_item(Item=parse_floats_to_decimals(booking))

    _put_notification(
        user_info["userId"],
        "Payment successful",
        f"You rental payment of {amount} {currency} (ref {txn_ref}) was received. Booking {booking_id} is confirmed.",
        ntype="PAYMENT",
    )

    return build_response(201, payment_item)


def get_payment(payment_id, user_info):
    response = payments_table.get_item(Key={"paymentId": payment_id})
    item = response.get("Item")
    if not item:
        return build_response(404, {"message": f"Payment '{payment_id}' not found"})
    if item.get("userId") != user_info["userId"] and not is_admin(user_info):
        return build_response(403, {"message": "Forbidden: Access denied"})
    return build_response(200, item)


def list_payments(user_info):
    if is_admin(user_info):
        response = payments_table.scan()
        items = response.get("Items", [])
        items.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
        return build_response(200, items)

    response = payments_table.query(
        IndexName="UserPaymentsIndex",
        KeyConditionExpression=Key("userId").eq(user_info["userId"]),
    )
    items = response.get("Items", [])
    items.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    return build_response(200, items)


def update_payment(payment_id, event, user_info):
    """Admin-only: refund a payment."""
    if not is_admin(user_info):
        return build_response(403, {"message": "Forbidden: Only administrators can refund payments"})

    body = json.loads(event.get("body") or "{}")
    new_status = body.get("status", "REFUNDED").upper()

    response = payments_table.get_item(Key={"paymentId": payment_id})
    existing = response.get("Item")
    if not existing:
        return build_response(404, {"message": f"Payment '{payment_id}' not found"})

    existing["status"] = new_status
    if new_status == "REFUNDED":
        existing["type"] = "REFUND"

    payments_table.put_item(Item=parse_floats_to_decimals(existing))

    # Cancel associated booking when refunded
    booking_id = existing.get("bookingId")
    if booking_id:
        b_resp = bookings_table.get_item(Key={"bookingId": booking_id})
        booking = b_resp.get("Item")
        if booking:
            booking["status"] = "CANCELLED"
            booking["paymentStatus"] = "REFUNDED"
            bookings_table.put_item(Item=parse_floats_to_decimals(booking))
            _put_notification(
                existing.get("userId"),
                "Booking cancelled - payment refunded",
                f"Your payment {payment_id} was refunded and booking {booking_id} has been cancelled.",
                ntype="PAYMENT",
            )

    return build_response(200, existing)