import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

BACKEND_DIR = Path(__file__).resolve().parents[2] / "Backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from handlers import bookings, content, service_orders


class FakeTable:
    def __init__(self, items=None, item=None):
        self.items = items or []
        self.item = item
        self.last_query = None

    def scan(self, **kwargs):
        return {"Items": self.items}

    def query(self, **kwargs):
        self.last_query = kwargs
        return {"Items": self.items}

    def get_item(self, **kwargs):
        return {"Item": self.item} if self.item else {}

    def put_item(self, **kwargs):
        self.item = kwargs["Item"]

    def delete_item(self, **kwargs):
        return {}


class ContentAndServiceTests(unittest.TestCase):
    def test_public_content_list_hides_drafts(self):
        table = FakeTable(items=[
            {"contentId": "live", "type": "POST", "title": "Live", "published": True},
            {"contentId": "draft", "type": "POST", "title": "Draft", "published": False},
        ])
        with patch.object(content, "content_table", table):
            response = content.list_content({"type": "POST"}, admin=False)
        self.assertEqual(response["statusCode"], 200)
        self.assertEqual([row["contentId"] for row in json.loads(response["body"])], ["live"])

    def test_customer_cannot_create_admin_content(self):
        event = {
            "httpMethod": "POST",
            "body": json.dumps({"type": "EVENT", "title": "Event", "summary": "Details"}),
            "requestContext": {"authorizer": {"claims": {"sub": "customer-1"}}},
        }
        response = content.handler(event, None)
        self.assertEqual(response["statusCode"], 403)

    def test_customer_cannot_update_service_order_status(self):
        event = {
            "httpMethod": "PUT",
            "pathParameters": {"orderId": "svc_123"},
            "body": json.dumps({"status": "COMPLETED"}),
            "requestContext": {"authorizer": {"claims": {"sub": "customer-1"}}},
        }
        response = service_orders.handler(event, None)
        self.assertEqual(response["statusCode"], 403)

    def test_admin_cannot_create_customer_service_order(self):
        event = {
            "body": json.dumps({"serviceId": "fleet", "contactPhone": "+237600000000", "pickupLocation": "Douala"})
        }
        response = service_orders.create_order(event, {"userId": "admin-1", "role": "ADMIN"})
        self.assertEqual(response["statusCode"], 403)

    def test_service_order_requires_published_service(self):
        event = {
            "httpMethod": "POST",
            "body": json.dumps({"serviceId": "service-1", "contactPhone": "+237600000000"}),
            "requestContext": {"authorizer": {"claims": {"sub": "customer-1"}}},
        }
        with patch.object(service_orders, "content_table", FakeTable()):
            response = service_orders.create_order(event, {"userId": "customer-1", "role": "CUSTOMER"})
        self.assertEqual(response["statusCode"], 404)

    def test_builtin_service_order_saves_with_accented_city(self):
        event = {
            "body": json.dumps({
                "serviceId": "airport-transfer",
                "contactPhone": "+237600000000",
                "pickupLocation": "Yaoundé",
                "requestedDate": "2026-10-20",
                "details": "Flight arrives in the afternoon",
            })
        }
        orders_table = FakeTable()
        with patch.object(service_orders, "content_table", FakeTable()), patch.object(
            service_orders, "orders_table", orders_table
        ):
            response = service_orders.create_order(
                event, {"userId": "customer-1", "email": "customer@example.com", "role": "CUSTOMER"}
            )

        order = json.loads(response["body"])
        self.assertEqual(response["statusCode"], 201)
        self.assertEqual(order["serviceTitle"], "Airport Transfer")
        self.assertEqual(order["pickupLocation"], "Yaoundé")
        self.assertEqual(order["status"], "NEW")
        self.assertEqual(orders_table.item["serviceId"], "airport-transfer")

    def test_published_car_discount_applies_only_inside_date_window(self):
        promotion_table = FakeTable(items=[
            {"type": "DISCOUNT", "carId": "car-1", "published": True, "percentOff": 20, "startDate": "2026-10-01", "endDate": "2026-10-31"},
            {"type": "DISCOUNT", "carId": "car-2", "published": True, "percentOff": 90},
            {"type": "DISCOUNT", "carId": "car-1", "published": False, "percentOff": 50},
        ])
        with patch.object(bookings, "content_table", promotion_table):
            applied = bookings._promotion_discount("car-1", "2026-10-15", 100000)
            expired = bookings._promotion_discount("car-1", "2026-11-01", 100000)
        self.assertEqual(applied, 20000)
        self.assertEqual(expired, 0)


if __name__ == "__main__":
    unittest.main()
