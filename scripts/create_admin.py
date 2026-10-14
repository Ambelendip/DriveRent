"""Create (or promote) the platform administrator in the deployed Cognito user pool."""

import argparse
import os
import sys

import boto3

REGION = os.environ.get("AWS_REGION", "us-east-1")
ADMIN_GROUP = "Admins"


def find_pool_id(client, name="CarRentalUserPool"):
    paginator = client.get_paginator("list_user_pools")
    for page in paginator.paginate(MaxResults=60):
        for pool in page.get("UserPools", []):
            if pool.get("Name") == name:
                return pool.get("Id")
    return None


def ensure_group(client, pool_id):
    """The frontend detects admins from the 'cognito:groups' ID-token claim.
    Adding the user to a group is the most reliable way to make the ADMIN
    role appear, since Cognito auto-includes groups in the token."""
    try:
        client.create_group(UserPoolId=pool_id, GroupName=ADMIN_GROUP)
        print(f"Created Cognito group '{ADMIN_GROUP}'.")
    except client.exceptions.GroupExistsException:
        print(f"Cognito group '{ADMIN_GROUP}' already exists.")
    except Exception as e:
        print(f"Note: could not create group '{ADMIN_GROUP}': {e}")


def main():
    parser = argparse.ArgumentParser(description="Create or promote an admin in the CarRental Cognito pool")
    parser.add_argument("--pool-id", default=None, help="Cognito User Pool ID (auto-detects by name if omitted)")
    parser.add_argument("--email", required=True, help="Admin email address")
    parser.add_argument("--password", default=None, help="Permanent password (optional if user already has one)")
    parser.add_argument("--promote", action="store_true", help="Promote an existing CUSTOMER to ADMIN")
    args = parser.parse_args()

    client = boto3.client("cognito-idp", region_name=REGION)

    pool_id = args.pool_id or find_pool_id(client)
    if not pool_id:
        sys.exit("ERROR: Could not locate the CarRentalUserPool. Pass --pool-id explicitly.")

    ensure_group(client, pool_id)

    existing = None
    try:
        existing = client.admin_get_user(UserPoolId=pool_id, Username=args.email)
    except client.exceptions.UserNotFoundException:
        existing = None
    except Exception:
        existing = None

    if existing and not args.promote:
        print("User already exists. Promoting to ADMIN...")
        args.promote = True

    if existing is None:
        client.admin_create_user(
            UserPoolId=pool_id,
            Username=args.email,
            UserAttributes=[
                {"Name": "email", "Value": args.email},
                {"Name": "email_verified", "Value": "true"},
                {"Name": "custom:role", "Value": "ADMIN"},
            ],
            MessageAction="SUPPRESS",
        )
        print("Created user:", args.email)
    else:
        print("Using existing user:", args.email)

    if args.password:
        client.admin_set_user_password(
            UserPoolId=pool_id,
            Username=args.email,
            Password=args.password,
            Permanent=True,
        )
        print("Set permanent password.")

    client.admin_update_user_attributes(
        UserPoolId=pool_id,
        Username=args.email,
        UserAttributes=[{"Name": "custom:role", "Value": "ADMIN"}],
    )
    print("Set custom:role = ADMIN")

    try:
        client.admin_add_user_to_group(
            UserPoolId=pool_id,
            Username=args.email,
            GroupName=ADMIN_GROUP,
        )
        print(f"Added {args.email} to Cognito group '{ADMIN_GROUP}'.")
    except Exception as e:
        print(f"Note: could not add user to group: {e}")

    print("")
    print("Pool ID :", pool_id)
    print("Done. Sign in at the CloudFront URL /login")
    print("IMPORTANT: If the admin was already signed in, sign OUT and sign back IN")
    print("so Cognito issues a fresh ID token that includes the ADMIN role/group.")


if __name__ == "__main__":
    main()
