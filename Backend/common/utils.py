import json
from decimal import Decimal


def decimal_default(obj):
    if isinstance(obj, Decimal):
        if obj % 1 == 0:
            return int(obj)
        return float(obj)
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def parse_floats_to_decimals(obj):
    if isinstance(obj, float):
        return Decimal(str(obj))
    if isinstance(obj, dict):
        return {k: parse_floats_to_decimals(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [parse_floats_to_decimals(v) for v in obj]
    return obj


def build_response(status_code: int, body: any):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        },
        "body": json.dumps(body, default=decimal_default),
    }


def extract_claims(event):
    """Extract authenticated user details from API Gateway Cognito Authorizer."""
    authorizer = (event.get("requestContext") or {}).get("authorizer") or {}
    claims = authorizer.get("claims") or {}
    
    user_id = claims.get("sub") or claims.get("username")
    email = claims.get("email", "")
    
    role = claims.get("custom:role", "CUSTOMER")
    groups = claims.get("cognito:groups", "")
    if isinstance(groups, str) and "admin" in groups.lower():
        role = "ADMIN"
    elif isinstance(groups, list) and any("admin" in str(g).lower() for g in groups):
        role = "ADMIN"

    return {
        "userId": user_id,
        "email": email,
        "role": role,
        "claims": claims,
    }


def is_admin(user_info):
    return user_info.get("role") == "ADMIN"


def normalize_car(item):
    if not item:
        return item
    brand = item.get("brand") or item.get("make", "")
    daily_rate = item.get("pricePerDay") if "pricePerDay" in item else item.get("dailyRate", 0)
    available = item.get("available") if "available" in item else item.get("isAvailable", True)
    
    item["brand"] = brand
    item["make"] = brand
    item["pricePerDay"] = daily_rate
    item["dailyRate"] = daily_rate
    item["available"] = available
    item["isAvailable"] = available
    
    if "imageUrls" not in item:
        item["imageUrls"] = [item["imageUrl"]] if "imageUrl" in item else []
    return item


def normalize_booking(item):
    if not item:
        return item
    pickup_date = item.get("pickupDate") or item.get("startDate", "")
    return_date = item.get("returnDate") or item.get("endDate", "")
    
    item["pickupDate"] = pickup_date
    item["startDate"] = pickup_date
    item["returnDate"] = return_date
    item["endDate"] = return_date
    return item

