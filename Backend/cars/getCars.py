import json
import os
import boto3
from botocore.exceptions import ClientError

# Initialize DynamoDB resource outside the handler to reuse connection across invocations
dynamodb = boto3.resource('dynamodb')
table_name = os.environ.get('CARS_TABLE_NAME')
table = dynamodb.Table(table_name)

def handler(event, context):
    # Required headers for CORS compliance with frontend requests
    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key",
        "Access-Control-Allow-Methods": "GET,OPTIONS"
    }

    try:
        # Scan the table to retrieve all car items
        response = table.scan()
        cars = response.get('Items', [])

        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps(cars)
        }

    except ClientError as e:
        print(f"DynamoDB Error: {e.response['Error']['Message']}")
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"message": "Error fetching cars from database"})
        }
    except Exception as e:
        print(f"Unexpected Error: {str(e)}")
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"message": "Internal server error"})
        }