import json
import os
import uuid
from datetime import datetime, timezone

import boto3
from boto3.dynamodb.conditions import Key

from common.utils import build_response, extract_claims, is_admin, parse_floats_to_decimals


dynamodb = boto3.resource("dynamodb")
content_table = dynamodb.Table(os.environ.get("CONTENT_TABLE_NAME", "CarRentalContent"))
CONTENT_TYPES = {"POST", "EVENT", "DISCOUNT", "SERVICE"}
EDITABLE_FIELDS = {
    "type",
    "title",
    "slug",
    "summary",
    "body",
    "imageUrl",
    "imageAlt",
    "startDate",
    "endDate",
    "location",
    "carId",
    "percentOff",
    "serviceKey",
    "priceFrom",
    "published",
    "featured",
}


def _now():
    return datetime.now(timezone.utc).isoformat()


def handler(event, context):
    method = event.get("httpMethod", "").upper()
    if method == "OPTIONS":
        return build_response(200, {"message": "OK"})

    user_info = extract_claims(event)
    is_admin_user = is_admin(user_info)
    query = event.get("queryStringParameters") or {}
    content_id = (event.get("pathParameters") or {}).get("contentId")

    try:
        if method == "GET":
            if content_id:
                return get_content(content_id, is_admin_user)
            return list_content(query, is_admin_user)

        if not user_info.get("userId"):
            return build_response(401, {"message": "Authentication required"})
        if not is_admin_user:
            return build_response(403, {"message": "Only administrators can manage content"})

        if method == "POST":
            return create_content(event, user_info)
        if method == "PUT" and content_id:
            return update_content(content_id, event)
        if method == "DELETE" and content_id:
            content_table.delete_item(Key={"contentId": content_id})
            return build_response(200, {"message": "Content deleted"})
        return build_response(400, {"message": "Unsupported method or content route"})
    except (ValueError, TypeError) as exc:
        return build_response(400, {"message": str(exc)})
    except Exception as exc:
        print(f"Content handler error: {exc}")
        return build_response(500, {"message": "Unable to process content request"})


def _validate_and_clean(body, partial=False):
    if not isinstance(body, dict):
        raise ValueError("Content body must be an object")
    item = {key: body[key] for key in EDITABLE_FIELDS if key in body}
    kind = str(item.get("type", "")).upper()
    if not partial or "type" in item:
        if kind not in CONTENT_TYPES:
            raise ValueError("Type must be POST, EVENT, DISCOUNT, or SERVICE")
        item["type"] = kind

    if not partial:
        for field in ("title", "summary"):
            if not str(item.get(field, "")).strip():
                raise ValueError(f"{field} is required")
        item.setdefault("published", False)
        item.setdefault("featured", False)

    if "title" in item:
        item["title"] = str(item["title"]).strip()[:160]
    if "slug" in item:
        item["slug"] = str(item["slug"]).strip().lower()[:180]
    for field, limit in (("summary", 600), ("body", 12000), ("imageUrl", 2048), ("imageAlt", 240), ("location", 160), ("serviceKey", 80)):
        if field in item:
            item[field] = str(item[field]).strip()[:limit]
    for field in ("published", "featured"):
        if field in item:
            item[field] = bool(item[field])
    if "percentOff" in item:
        percent = float(item["percentOff"])
        if not 0 < percent <= 100:
            raise ValueError("Discount percent must be greater than 0 and at most 100")
        item["percentOff"] = percent
    if "priceFrom" in item:
        price = float(item["priceFrom"])
        if price < 0:
            raise ValueError("Starting price cannot be negative")
        item["priceFrom"] = price
    if kind == "DISCOUNT" or item.get("type") == "DISCOUNT":
        if not item.get("carId"):
            raise ValueError("Select a car for this discount")
        item["carId"] = str(item["carId"]).strip()
        if "percentOff" not in item and not partial:
            raise ValueError("Discount percent is required")
    return item


def create_content(event, user_info):
    body = json.loads(event.get("body") or "{}")
    item = _validate_and_clean(body)
    item.update(
        {
            "contentId": f"cnt_{uuid.uuid4().hex[:14]}",
            "createdAt": _now(),
            "updatedAt": _now(),
            "createdBy": user_info["userId"],
        }
    )
    content_table.put_item(Item=parse_floats_to_decimals(item))
    return build_response(201, item)


def update_content(content_id, event):
    existing = content_table.get_item(Key={"contentId": content_id}).get("Item")
    if not existing:
        return build_response(404, {"message": "Content not found"})
    body = json.loads(event.get("body") or "{}")
    updates = _validate_and_clean(body, partial=True)
    existing.update(updates)
    existing["updatedAt"] = _now()
    content_table.put_item(Item=parse_floats_to_decimals(existing))
    return build_response(200, existing)


def get_content(content_id, admin):
    item = content_table.get_item(Key={"contentId": content_id}).get("Item")
    if not item or (not admin and not item.get("published", False)):
        return build_response(404, {"message": "Content not found"})
    return build_response(200, item)


def list_content(query, admin):
    response = content_table.scan()
    items = response.get("Items", [])
    while response.get("LastEvaluatedKey"):
        response = content_table.scan(ExclusiveStartKey=response["LastEvaluatedKey"])
        items.extend(response.get("Items", []))

    kind = str(query.get("type", "")).upper()
    if kind and kind not in CONTENT_TYPES:
        return build_response(400, {"message": "Unsupported content type"})
    if not admin:
        items = [item for item in items if item.get("published", False)]
    if kind:
        items = [item for item in items if item.get("type") == kind]
    items.sort(key=lambda item: item.get("updatedAt", item.get("createdAt", "")), reverse=True)
    return build_response(200, items)
