import json
import os
import boto3
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ.get('BOOKINGS_TABLE_NAME'))

def handler(event, context):
    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,OPTIONS"
    }

    # Extract authenticated identity from JWT token claims
    claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
    authenticated_user_id = claims.get('sub')

    # Extract target userId from URL path
    target_user_id = (event.get("pathParameters") or {}).get("userId")

    # Enforce access control
    if not authenticated_user_id or authenticated_user_id != target_user_id:
        return {
            "statusCode": 403,
            "headers": headers,
            "body": json.dumps({"message": "Forbidden: You cannot access other users' bookings"})
        }

    response = table.query(
        IndexName='UserBookingsIndex',
        KeyConditionExpression=Key('userId').eq(target_user_id)
    )

    return {
        "statusCode": 200,
        "headers": headers,
        "body": json.dumps(response.get('Items', []))
    }