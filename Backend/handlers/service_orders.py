import json
import os
import unicodedata
import uuid
from datetime import datetime, timezone

import boto3
from boto3.dynamodb.conditions import Key

from common.utils import build_response, extract_claims, is_admin, parse_floats_to_decimals
from common.service_catalog import PICKUP_CITIES, SERVICE_CATALOG


dynamodb = boto3.resource("dynamodb")
orders_table = dynamodb.Table(os.environ.get("SERVICE_ORDERS_TABLE_NAME", "CarRentalServiceOrders"))
content_table = dynamodb.Table(os.environ.get("CONTENT_TABLE_NAME", "CarRentalContent"))
ORDER_STATUSES = {"NEW", "CONTACTED", "CONFIRMED", "COMPLETED", "CANCELLED"}


def _now():
    return datetime.now(timezone.utc).isoformat()


def handler(event, context):
    method = event.get("httpMethod", "").upper()
    if method == "OPTIONS":
        return build_response(200, {"message": "OK"})

    user_info = extract_claims(event)
    if not user_info.get("userId"):
        return build_response(401, {"message": "Authentication required"})

    order_id = (event.get("pathParameters") or {}).get("orderId")
    try:
        if method == "GET":
            return list_orders(user_info)
        if method == "POST":
            return create_order(event, user_info)
        if method == "PUT" and order_id:
            if not is_admin(user_info):
                return build_response(403, {"message": "Only administrators can update service orders"})
            return update_order(order_id, event)
        return build_response(400, {"message": "Unsupported service order route"})
    except (ValueError, TypeError) as exc:
        return build_response(400, {"message": str(exc)})
    except Exception as exc:
        print(f"Service order handler error: {exc}")
        return build_response(500, {"message": "Unable to process service order"})


def create_order(event, user_info):
    if is_admin(user_info):
        return build_response(403, {"message": "Administrators cannot place customer service orders"})
    body = json.loads(event.get("body") or "{}")
    service_id = str(body.get("serviceId", "")).strip()
    if not service_id:
        return build_response(400, {"message": "Choose a service"})

    service_title = SERVICE_CATALOG.get(service_id)
    if not service_title:
        service = content_table.get_item(Key={"contentId": service_id}).get("Item")
        if not service or service.get("type") != "SERVICE" or not service.get("published"):
            return build_response(404, {"message": "Service is not available"})
        service_title = service["title"]

    pickup_location = str(body.get("pickupLocation", "")).strip()
    normalized_location = "".join(
        character
        for character in unicodedata.normalize("NFKD", pickup_location.casefold())
        if not unicodedata.combining(character)
    )
    canonical_location = PICKUP_CITIES.get(normalized_location)
    if not canonical_location:
        return build_response(400, {"message": "Choose a pickup city from the list"})

    order = {
        "orderId": f"svc_{uuid.uuid4().hex[:14]}",
        "userId": user_info["userId"],
        "userEmail": user_info.get("email", ""),
        "serviceId": service_id,
        "serviceTitle": service_title,
        "contactPhone": str(body.get("contactPhone", "")).strip()[:40],
        "requestedDate": str(body.get("requestedDate", "")).strip()[:40],
        "pickupLocation": canonical_location,
        "details": str(body.get("details", "")).strip()[:2000],
        "status": "NEW",
        "createdAt": _now(),
        "updatedAt": _now(),
    }
    if not order["contactPhone"]:
        return build_response(400, {"message": "Contact phone is required"})
    orders_table.put_item(Item=order)
    return build_response(201, order)


def list_orders(user_info):
    if is_admin(user_info):
        response = orders_table.scan()
        items = response.get("Items", [])
        while response.get("LastEvaluatedKey"):
            response = orders_table.scan(ExclusiveStartKey=response["LastEvaluatedKey"])
            items.extend(response.get("Items", []))
    else:
        response = orders_table.query(
            IndexName="UserServiceOrdersIndex",
            KeyConditionExpression=Key("userId").eq(user_info["userId"]),
            ScanIndexForward=False,
        )
        items = response.get("Items", [])
        while response.get("LastEvaluatedKey"):
            response = orders_table.query(
                IndexName="UserServiceOrdersIndex",
                KeyConditionExpression=Key("userId").eq(user_info["userId"]),
                ScanIndexForward=False,
                ExclusiveStartKey=response["LastEvaluatedKey"],
            )
            items.extend(response.get("Items", []))
    items.sort(key=lambda item: item.get("createdAt", ""), reverse=True)
    return build_response(200, items)


def update_order(order_id, event):
    order = orders_table.get_item(Key={"orderId": order_id}).get("Item")
    if not order:
        return build_response(404, {"message": "Service order not found"})
    body = json.loads(event.get("body") or "{}")
    status = str(body.get("status", "")).upper()
    if status not in ORDER_STATUSES:
        return build_response(400, {"message": "Invalid service order status"})
    order["status"] = status
    if "adminNote" in body:
        order["adminNote"] = str(body["adminNote"]).strip()[:1000]
    order["updatedAt"] = _now()
    orders_table.put_item(Item=parse_floats_to_decimals(order))
    return build_response(200, order)
