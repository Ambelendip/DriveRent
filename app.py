#!/usr/bin/env python3
import aws_cdk as cdk
from car_rental_platform.database_stack import DatabaseStack
from car_rental_platform.api_stack import ApiStack
from car_rental_platform.full_api_stack import FullApiStack
from car_rental_platform.frontend_stack import FrontendStack

app = cdk.App()

# Step 1: Instantiate Database Stack
db_stack = DatabaseStack(app, "DatabaseStack")

# Step 2: Instantiate API Stack and pass all tables
api_stack = ApiStack(
    app, 
    "ApiStack",
    cars_table=db_stack.cars_table,
    users_table=db_stack.users_table,
    bookings_table=db_stack.bookings_table
)

# Step 3: Full-featured API stack (reuses live tables + Cognito pool)
full_api_stack = FullApiStack(app, "FullApiStack")

# Step 4: Instantiate Frontend hosting stack (S3 + CloudFront)
frontend_stack = FrontendStack(app, "FrontendStack")

app.synth()
