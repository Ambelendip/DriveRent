from aws_cdk import (
    Stack,
    aws_dynamodb as dynamodb,
    RemovalPolicy,
)
from constructs import Construct


class DatabaseStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # -------------------------------------------------------------
        # 1. USERS TABLE
        # -------------------------------------------------------------
        self.users_table = dynamodb.Table(
            self,
            "CarRentalUsers",
            table_name="CarRentalUsers",
            partition_key=dynamodb.Attribute(
                name="userId",
                type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,  # Development only
        )

        # GSI: Allows fetching a user profile by email address
        self.users_table.add_global_secondary_index(
            index_name="EmailIndex",
            partition_key=dynamodb.Attribute(
                name="email",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # -------------------------------------------------------------
        # 2. BOOKINGS / ORDERS TABLE
        # -------------------------------------------------------------
        self.bookings_table = dynamodb.Table(
            self,
            "CarRentalBookings",
            table_name="CarRentalBookings",
            partition_key=dynamodb.Attribute(
                name="bookingId",
                type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,  # Development only
        )

        # GSI 1: Allows fetching all bookings made by a specific user
        self.bookings_table.add_global_secondary_index(
            index_name="UserBookingsIndex",
            partition_key=dynamodb.Attribute(
                name="userId",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="createdAt",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # GSI 2: Allows checking all active bookings for a specific car
        self.bookings_table.add_global_secondary_index(
            index_name="CarBookingsIndex",
            partition_key=dynamodb.Attribute(
                name="carId",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="startDate",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )