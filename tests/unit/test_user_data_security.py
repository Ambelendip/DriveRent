import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

BACKEND_DIR = Path(__file__).resolve().parents[2] / "Backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from handlers import users


class FakeTable:
    def __init__(self, item=None, items=None):
        self.item = item
        self.items = items or []

    def get_item(self, **kwargs):
        return {"Item": self.item} if self.item else {}

    def scan(self):
        return {"Items": self.items}

    def query(self, **kwargs):
        return {"Items": []}


class UserDataSecurityTests(unittest.TestCase):
    def test_customer_cannot_read_another_profile(self):
        event = {
            "httpMethod": "GET",
            "pathParameters": {"userId": "another-user"},
            "requestContext": {
                "authorizer": {
                    "claims": {"sub": "customer-1", "cognito:groups": "Customers"}
                }
            },
        }

        response = users.handler(event, None)

        self.assertEqual(response["statusCode"], 403)
        self.assertIn("Admin access required", response["body"])

    def test_admin_user_list_omits_sensitive_profile_fields(self):
        profile = {
            "userId": "customer-1",
            "email": "customer@example.com",
            "name": "Customer",
            "phone": "+237600000000",
            "address": "Private address",
            "dateOfBirth": "2000-01-01",
            "city": "Douala",
            "country": "Cameroon",
            "registrationDate": "2026-01-01T00:00:00+00:00",
            "accountStatus": "ACTIVE",
        }
        with patch.object(users, "table", FakeTable(items=[profile])), patch.object(
            users, "bookings_table", FakeTable()
        ):
            response = users.admin_list_users()

        result = json.loads(response["body"])[0]
        self.assertEqual(response["statusCode"], 200)
        self.assertEqual(result["userId"], "customer-1")
        self.assertEqual(result["email"], "customer@example.com")
        self.assertNotIn("phone", result)
        self.assertNotIn("address", result)
        self.assertNotIn("dateOfBirth", result)


if __name__ == "__main__":
    unittest.main()
