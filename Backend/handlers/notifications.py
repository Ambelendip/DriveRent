import json
import os
import uuid
from datetime import datetime, timezone

import boto3
from boto3.dynamodb.conditions import Key

from common.utils import build_response, extract_claims, is_admin, parse_floats_to_decimals

dynamodb = boto3.resource("dynamodb")
table_name = os.environ.get("NOTIFICATIONS_TABLE_NAME", "CarRentalNotifcations")
table = dynamodb.Table(table_name)


def handler(event, context):
    http_method = event.get("httpMethod", "").upper()
    path_parameters = event.get("pathParameters") or {}
    notification_id = path_parameters.get("notificationId")

    if http_method == "OPTIONS":
        return build_response(200, {"message": "OK"})

    user_info = extract_claims(event)
    if not user_info.get("userId"):
        return build_response(401, {"message": "Unauthorized: Missing identity token claims"})

    try:
        if http_method == "GET" and not notification_id:
            return list_notifications(user_info)
        if http_method == "GET" and notification_id == "unread-count":
            return unread_count(user_info)
        if http_method == "PUT" and notification_id:
            return mark_read(notification_id, user_info)
        if http_method == "DELETE" and notification_id:
            return delete_notification(notification_id, user_info)

        return build_response(400, {"message": f"Unsupported method or path: {http_method}"})
    except Exception as e:
        print(f"Error handling notification: {str(e)}")
        return build_response(500, {"message": str(e)})


def list_notifications(user_info):
    response = table.query(
        IndexName="UserNotificationsIndex",
        KeyConditionExpression=Key("userId").eq(user_info["userId"]),
        ScanIndexForward=False,
    )
    items = response.get("Items", [])
    return build_response(200, items)


def unread_count(user_info):
    response = table.query(
        IndexName="UserNotificationsIndex",
        KeyConditionExpression=Key("userId").eq(user_info["userId"]),
        ScanIndexForward=False,
    )
    count = sum(1 for i in response.get("Items", []) if not i.get("read"))
    return build_response(200, {"count": count})


def mark_read(notification_id, user_info):
    response = table.get_item(Key={"notificationId": notification_id})
    item = response.get("Item")
    if not item:
        return build_response(404, {"message": "Notification not found"})
    if item.get("userId") != user_info["userId"] and not is_admin(user_info):
        return build_response(403, {"message": "Forbidden: Cannot modify another user's notification"})
    item["read"] = True
    table.put_item(Item=parse_floats_to_decimals(item))
    return build_response(200, item)


def delete_notification(notification_id, user_info):
    response = table.get_item(Key={"notificationId": notification_id})
    item = response.get("Item")
    if not item:
        return build_response(404, {"message": "Notification not found"})
    if item.get("userId") != user_info["userId"] and not is_admin(user_info):
        return build_response(403, {"message": "Forbidden: Cannot delete another user's notification"})
    table.delete_item(Key={"notificationId": notification_id})
    return build_response(200, {"message": "Notification deleted"})