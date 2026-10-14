import json
import os
import uuid
import boto3
from botocore.exceptions import ClientError

from common.utils import (
    build_response,
    extract_claims,
    is_admin,
    normalize_car,
    parse_floats_to_decimals,
)

dynamodb = boto3.resource("dynamodb")
table_name = os.environ.get("CARS_TABLE_NAME", "CarRentalCars")
table = dynamodb.Table(table_name)


def handler(event, context):
    http_method = event.get("httpMethod", "").upper()
    path_parameters = event.get("pathParameters") or {}
    car_id = path_parameters.get("carId")

    if http_method == "OPTIONS":
        return build_response(200, {"message": "OK"})

    try:
        if http_method == "GET":
            if car_id:
                return get_car(car_id)
            return list_cars(event.get("queryStringParameters") or {})

        user_info = extract_claims(event)

        # Only administrators may add, edit, or remove cars.
        # Customers can browse (GET) but cannot modify the fleet.
        write_methods = {"POST", "PUT", "DELETE"}
        if http_method in write_methods:
            if not is_admin(user_info):
                return build_response(
                    403,
                    {"message": "Forbidden: Only administrators can manage cars"},
                )

        if http_method == "POST":
            return create_car(event, user_info)
        elif http_method == "PUT" and car_id:
            return update_car(car_id, event, user_info)
        elif http_method == "DELETE" and car_id:
            return delete_car(car_id, user_info)

        return build_response(400, {"message": f"Unsupported route or method: {http_method}"})

    except Exception as e:
        print(f"Error handling car request: {str(e)}")
        return build_response(500, {"message": str(e)})


def list_cars(query_params):
    response = table.scan()
    items = [normalize_car(item) for item in response.get("Items", [])]

    # Filter in memory if query parameters supplied
    location_filter = (query_params.get("location") or "").strip().lower()
    type_filter = (query_params.get("type") or "").strip().upper()
    transmission_filter = (query_params.get("transmission") or "").strip().upper()
    fuel_filter = (query_params.get("fuelType") or "").strip().upper()

    filtered = []
    for car in items:
        if location_filter and location_filter not in (car.get("location") or "").lower():
            continue
        if type_filter and (car.get("type") or "").upper() != type_filter:
            continue
        if transmission_filter and (car.get("transmission") or "").upper() != transmission_filter:
            continue
        if fuel_filter and (car.get("fuelType") or "").upper() != fuel_filter:
            continue
        filtered.append(car)

    return build_response(200, filtered)


def get_car(car_id):
    response = table.get_item(Key={"carId": car_id})
    item = response.get("Item")
    if not item:
        return build_response(404, {"message": f"Car with ID '{car_id}' not found"})
    return build_response(200, normalize_car(item))


def create_car(event, user_info):
    body = json.loads(event.get("body") or "{}")
    if not body.get("brand") and not body.get("make"):
        return build_response(400, {"message": "Car brand/make is required"})
    if not body.get("model"):
        return build_response(400, {"message": "Car model is required"})

    car_id = body.get("carId") or f"car-{uuid.uuid4().hex[:8]}"
    car_item = {
        "carId": car_id,
        "brand": body.get("brand") or body.get("make", ""),
        "make": body.get("brand") or body.get("make", ""),
        "model": body.get("model", ""),
        "year": int(body.get("year", 2024)),
        "type": body.get("type", "SEDAN"),
        "transmission": body.get("transmission", "AUTOMATIC"),
        "fuelType": body.get("fuelType", "PETROL"),
        "seats": int(body.get("seats", 5)),
        "pricePerDay": body.get("pricePerDay") or body.get("dailyRate", 50),
        "dailyRate": body.get("pricePerDay") or body.get("dailyRate", 50),
        "location": body.get("location", "Douala"),
        "description": body.get("description", ""),
        "available": body.get("available", True),
        "isAvailable": body.get("available", True),
        "imageUrls": body.get("imageUrls") or [],
    }

    item_to_save = parse_floats_to_decimals(car_item)
    table.put_item(Item=item_to_save)
    return build_response(201, normalize_car(car_item))


def update_car(car_id, event, user_info):
    body = json.loads(event.get("body") or "{}")
    
    # Check if exists
    response = table.get_item(Key={"carId": car_id})
    existing = response.get("Item")
    if not existing:
        return build_response(404, {"message": f"Car with ID '{car_id}' not found"})

    # Update attributes
    for key, value in body.items():
        if key != "carId":
            existing[key] = value

    existing = normalize_car(existing)
    table.put_item(Item=parse_floats_to_decimals(existing))
    return build_response(200, existing)


def delete_car(car_id, user_info):
    table.delete_item(Key={"carId": car_id})
    return build_response(200, {"message": f"Car '{car_id}' deleted successfully"})

