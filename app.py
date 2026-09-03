#!/usr/bin/env python3
import aws_cdk as cdk
from car_rental_platform.database_stack import DatabaseStack
from car_rental_platform.api_stack import ApiStack

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

app.synth()