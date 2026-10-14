import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

BACKEND_DIR = Path(__file__).resolve().parents[2] / "Backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from handlers import uploads


class UploadAuthorizationTests(unittest.TestCase):
    def make_event(self, claims, body=None):
        return {
            "httpMethod": "POST",
            "body": json.dumps(body or {"fileName": "story photo.jpg", "contentType": "image/jpeg", "folder": "content"}),
            "requestContext": {"authorizer": {"claims": claims}},
        }

    def test_admin_content_upload_uses_content_folder(self):
        with patch.object(uploads, "bucket_name", "media-bucket"), patch.object(
            uploads.s3_client, "generate_presigned_url", return_value="https://upload.example/signed"
        ) as presign:
            response = uploads.handler(self.make_event({"sub": "admin-1", "cognito:groups": "Admins"}), None)

        self.assertEqual(response["statusCode"], 200)
        call = presign.call_args.kwargs["Params"]
        self.assertTrue(call["Key"].startswith("content/"))
        self.assertTrue(call["Key"].endswith("story_photo.jpg"))

    def test_customer_cannot_get_upload_url(self):
        response = uploads.handler(self.make_event({"sub": "customer-1"}), None)
        self.assertEqual(response["statusCode"], 403)

    def test_non_image_upload_is_rejected(self):
        event = self.make_event({"sub": "admin-1", "cognito:groups": "Admins"}, {"fileName": "file.pdf", "contentType": "application/pdf"})
        with patch.object(uploads.s3_client, "generate_presigned_url") as presign:
            response = uploads.handler(event, None)
        self.assertEqual(response["statusCode"], 400)
        presign.assert_not_called()


if __name__ == "__main__":
    unittest.main()
