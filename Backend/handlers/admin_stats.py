import json
import os
from datetime import datetime, timezone

import boto3

from common.utils import build_response, extract_claims, is_admin

dynamodb = boto3.resource("dynamodb")
cars_table = dynamodb.Table(os.environ.get("CARS_TABLE_NAME", "CarRentalCars"))
users_table = dynamodb.Table(os.environ.get("USERS_TABLE_NAME", "CarRentalUsers"))
bookings_table = dynamodb.Table(os.environ.get("BOOKINGS_TABLE_NAME", "CarRentalBookings"))
payments_table = dynamodb.Table(os.environ.get("PAYMENTS_TABLE_NAME", "CarRentalPayments"))
reviews_table = dynamodb.Table(os.environ.get("REVIEWS_TABLE_NAME", "CarRentalReviews"))


def handler(event, context):
    http_method = event.get("httpMethod", "").upper()
    if http_method == "OPTIONS":
        return build_response(200, {"message": "OK"})

    user_info = extract_claims(event)
    if not is_admin(user_info):
        return build_response(403, {"message": "Forbidden: Admin access required"})

    try:
        if http_method == "GET":
            return dashboard_stats()
        return build_response(400, {"message": f"Unsupported method: {http_method}"})
    except Exception as e:
        print(f"Error building stats: {str(e)}")
        return build_response(500, {"message": str(e)})


def dashboard_stats():
    now = datetime.now(timezone.utc)
    today = now.date().isoformat()

    cars = cars_table.scan().get("Items", [])
    users = users_table.scan().get("Items", [])
    bookings = bookings_table.scan().get("Items", [])
    payments = payments_table.scan().get("Items", [])

    total_customers = len(users)
    total_vehicles = len(cars)
    available_vehicles = sum(
        1
        for c in cars
        if c.get("available", c.get("isAvailable", True))
        and not _car_has_active_booking(c.get("carId"), bookings)
    )
    currently_rented = sum(
        1 for b in bookings if b.get("status") == "ACTIVE"
    )
    maintenance = sum(1 for c in cars if c.get("status") == "MAINTENANCE")
    today_bookings = sum(1 for b in bookings if (b.get("createdAt") or "")[:10] == today)
    pending_bookings = sum(1 for b in bookings if b.get("status") == "PENDING")
    completed_bookings = sum(1 for b in bookings if b.get("status") == "COMPLETED")
    cancelled_bookings = sum(1 for b in bookings if b.get("status") == "CANCELLED")
    no_shows = sum(1 for b in bookings if b.get("status") == "NO-SHOW")

    successful_payments = [p for p in payments if p.get("status") == "SUCCESSFUL"]
    total_revenue = sum(float(p.get("amount", 0)) for p in successful_payments)
    refunds = [p for p in payments if p.get("status") == "REFUNDED"]
    total_refunds = sum(float(p.get("amount", 0)) for p in refunds)

    # Monthly revenue (current calendar month)
    month_prefix = now.strftime("%Y-%m")
    monthly_revenue = sum(
        float(p.get("amount", 0))
        for p in successful_payments
        if (p.get("createdAt") or "").startswith(month_prefix)
    )

    # Top rented cars
    car_rental_counts = {}
    for b in bookings:
        if b.get("status") == "COMPLETED":
            car_id = b.get("carId")
            car_rental_counts[car_id] = car_rental_counts.get(car_id, 0) + 1
    car_map = {c.get("carId"): c for c in cars}
    top_cars = [
        {
            "carId": cid,
            "carName": (
                f"{car_map[cid].get('brand') or car_map[cid].get('make','')} {car_map[cid].get('model','')}"
                if cid in car_map
                else cid
            ),
            "rentals": count,
        }
        for cid, count in sorted(car_rental_counts.items(), key=lambda kv: kv[1], reverse=True)[:5]
    ]

    return build_response(
        200,
        {
            "totalCustomers": total_customers,
            "totalVehicles": total_vehicles,
            "availableVehicles": available_vehicles,
            "currentlyRented": currently_rented,
            "maintenance": maintenance,
            "todaysBookings": today_bookings,
            "pendingBookings": pending_bookings,
            "completedBookings": completed_bookings,
            "cancelledBookings": cancelled_bookings,
            "noShows": no_shows,
            "totalRevenue": total_revenue,
            "totalRefunds": total_refunds,
            "monthlyRevenue": monthly_revenue,
            "topCars": top_cars,
            "generatedAt": now.isoformat(),
        },
    )


def _car_has_active_booking(car_id, bookings):
    for b in bookings:
        if b.get("carId") == car_id and b.get("status") in ("CONFIRMED", "ACTIVE"):
            return True
    return False