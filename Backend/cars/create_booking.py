import json
import os
import uuid
from datetime import datetime, timezone
import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb')
bookings_table_name = os.environ.get('BOOKINGS_TABLE_NAME')
table = dynamodb.Table(bookings_table_name)

def handler(event, context):
    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key",
        "Access-Control-Allow-Methods": "POST,OPTIONS"
    }

    # Handle CORS preflight requests
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": json.dumps({"message": "OK"})}

    try:
        body = json.loads(event.get("body") or "{}")

        user_id = body.get("userId")
        car_id = body.get("carId")
        start_date = body.get("startDate")
        end_date = body.get("endDate")
        total_price = body.get("totalPrice", 0)

        # Validate required fields
        if not all([user_id, car_id, start_date, end_date]):
            return {
                "statusCode": 400,
                "headers": headers,
                "body": json.dumps({"message": "Missing required fields: userId, carId, startDate, endDate"})
            }

        # Construct new booking record
        booking_id = f"book_{uuid.uuid4().hex[:12]}"
        created_at = datetime.now(timezone.utc).isoformat()

        booking_item = {
            "bookingId": booking_id,
            "userId": user_id,
            "carId": car_id,
            "startDate": start_date,
            "endDate": end_date,
            "totalPrice": str(total_price),
            "status": "CONFIRMED",
            "createdAt": created_at
        }

        # Insert record into DynamoDB
        table.put_item(Item=booking_item)

        return {
            "statusCode": 201,
            "headers": headers,
            "body": json.dumps({
                "message": "Booking created successfully",
                "booking": booking_item
            })
        }

    except ClientError as e:
        print(f"DynamoDB Error: {e.response['Error']['Message']}")
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"message": "Failed to create booking in database"})
        }
    except Exception as e:
        print(f"Unexpected Error: {str(e)}")
        return {
            "statusCode": 400,
            "headers": headers,
            "body": json.dumps({"message": "Invalid request payload"})
        }