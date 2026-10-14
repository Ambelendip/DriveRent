import json
import os
import re
import uuid
import boto3
from botocore.config import Config

from common.utils import build_response, extract_claims, is_admin

s3_client = boto3.client("s3", config=Config(signature_version="s3v4"))
bucket_name = os.environ.get("MEDIA_BUCKET_NAME", "")
region = os.environ.get("AWS_REGION", "us-east-1")


def handler(event, context):
    http_method = event.get("httpMethod", "").upper()

    if http_method == "OPTIONS":
        return build_response(200, {"message": "OK"})

    user_info = extract_claims(event)
    if not user_info.get("userId"):
        return build_response(401, {"message": "Unauthorized: Missing authentication claims"})
    if not is_admin(user_info):
        return build_response(403, {"message": "Forbidden: Only administrators can upload car photos"})

    try:
        if http_method == "POST":
            body = json.loads(event.get("body") or "{}")
            file_name = body.get("fileName", "image.jpg")
            content_type = body.get("contentType", "image/jpeg")
            if not isinstance(content_type, str) or not content_type.lower().startswith("image/"):
                return build_response(400, {"message": "Only image files can be uploaded"})
            requested_folder = str(body.get("folder", "cars")).strip("/")
            folder = requested_folder if requested_folder in {"cars", "content"} else "cars"

            # Clean and sanitize file name
            safe_name = re.sub(r"[^a-zA-Z0-9_.-]", "_", file_name)
            object_key = f"{folder}/{uuid.uuid4().hex[:10]}_{safe_name}"

            presigned_url = s3_client.generate_presigned_url(
                ClientMethod="put_object",
                Params={
                    "Bucket": bucket_name,
                    "Key": object_key,
                    "ContentType": content_type,
                },
                ExpiresIn=300,
            )

            file_url = f"https://{bucket_name}.s3.{region}.amazonaws.com/{object_key}"

            response_data = {
                "uploadUrl": presigned_url,
                "url": presigned_url,
                "fileUrl": file_url,
                "publicUrl": file_url,
                "objectUrl": file_url,
                "key": object_key,
            }
            return build_response(200, response_data)

        return build_response(400, {"message": f"Unsupported method: {http_method}"})

    except Exception as e:
        print(f"Error generating presigned url: {str(e)}")
        return build_response(500, {"message": str(e)})

