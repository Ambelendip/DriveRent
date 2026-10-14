import os
from aws_cdk import (
    CfnOutput,
    RemovalPolicy,
    Stack,
    aws_apigateway as apigw,
    aws_cognito as cognito,
    aws_dynamodb as dynamodb,
    aws_iam as iam,
    aws_lambda as _lambda,
    aws_s3 as s3,
)
from constructs import Construct


class FullApiStack(Stack):
    """Complete REST backend for the car rental platform.

    Non-destructive: imports the live DynamoDB tables and the live Cognito
    user pool/app client instead of replacing them. Adds new tables only.
    """

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # ------------------------------------------------------------------
        # 1. SHARED LIVE RESOURCES (imported, never recreated)
        # ------------------------------------------------------------------
        cars_table = dynamodb.Table.from_table_name(self, "CarsTable", "CarRentalCars")
        users_table = dynamodb.Table.from_table_name(self, "UsersTable", "CarRentalUsers")
        bookings_table = dynamodb.Table.from_table_name(self, "BookingsTable", "CarRentalBookings")

        user_pool = cognito.UserPool.from_user_pool_id(self, "UserPool", "us-east-1_O1lab9Cf6")
        user_pool_client = cognito.UserPoolClient.from_user_pool_client_id(
            self, "AppClient", "78of8nqhk0pg5as6tsf70jan06"
        )

        # ------------------------------------------------------------------
        # 2. NEW TABLES (payments, notifications, reviews)
        # ------------------------------------------------------------------
        payments_table = dynamodb.Table(
            self,
            "PaymentsTable",
            table_name="CarRentalPayments",
            partition_key=dynamodb.Attribute(
                name="paymentId", type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
        )
        payments_table.add_global_secondary_index(
            index_name="UserPaymentsIndex",
            partition_key=dynamodb.Attribute(
                name="userId", type=dynamodb.AttributeType.STRING
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        notifications_table = dynamodb.Table(
            self,
            "NotificationsTable",
            table_name="CarRentalNotifcations",
            partition_key=dynamodb.Attribute(
                name="notificationId", type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
        )
        notifications_table.add_global_secondary_index(
            index_name="UserNotificationsIndex",
            partition_key=dynamodb.Attribute(
                name="userId", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="createdAt", type=dynamodb.AttributeType.STRING
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        reviews_table = dynamodb.Table(
            self,
            "ReviewsTable",
            table_name="CarRentalReviews",
            partition_key=dynamodb.Attribute(
                name="reviewId", type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
        )
        reviews_table.add_global_secondary_index(
            index_name="CarReviewsIndex",
            partition_key=dynamodb.Attribute(
                name="carId", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="createdAt", type=dynamodb.AttributeType.STRING
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        content_table = dynamodb.Table(
            self,
            "ContentTable",
            table_name="CarRentalContent",
            partition_key=dynamodb.Attribute(
                name="contentId", type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.RETAIN,
        )
        content_table.add_global_secondary_index(
            index_name="ContentTypeCreatedAtIndex",
            partition_key=dynamodb.Attribute(
                name="type", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="createdAt", type=dynamodb.AttributeType.STRING
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        service_orders_table = dynamodb.Table(
            self,
            "ServiceOrdersTable",
            table_name="CarRentalServiceOrders",
            partition_key=dynamodb.Attribute(
                name="orderId", type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.RETAIN,
        )
        service_orders_table.add_global_secondary_index(
            index_name="UserServiceOrdersIndex",
            partition_key=dynamodb.Attribute(
                name="userId", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="createdAt", type=dynamodb.AttributeType.STRING
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # ------------------------------------------------------------------
        # 3. MEDIA BUCKET FOR CAR PHOTOS (dedicated to this stack)
        # ------------------------------------------------------------------
        media_bucket = s3.Bucket(
            self,
            "MediaBucket",
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
                public_read_access=True,
                block_public_access=s3.BlockPublicAccess(
                    block_public_acls=False,
                    block_public_policy=False,
                    ignore_public_acls=False,
                    restrict_public_buckets=False,
            ),
            cors=[
                s3.CorsRule(
                    allowed_methods=[
                        s3.HttpMethods.GET,
                        s3.HttpMethods.PUT,
                        s3.HttpMethods.POST,
                        s3.HttpMethods.HEAD,
                    ],
                    allowed_origins=["*"],
                    allowed_headers=["*"],
                )
            ],
        )

        # ------------------------------------------------------------------
        # 4. LAMBDA HANDLERS (full feature set, role-guarded)
        # ------------------------------------------------------------------
        backend_dir = os.path.join(os.path.dirname(__file__), "..", "Backend")
        code = _lambda.Code.from_asset(backend_dir)
        runtime = _lambda.Runtime.PYTHON_3_11

        cars_lambda = _lambda.Function(
            self,
            "CarsHandler",
            runtime=runtime,
            handler="handlers.cars.handler",
            code=code,
            environment={"CARS_TABLE_NAME": cars_table.table_name},
        )
        cars_table.grant_read_write_data(cars_lambda)

        bookings_lambda = _lambda.Function(
            self,
            "BookingsHandler",
            runtime=runtime,
            handler="handlers.bookings.handler",
            code=code,
            environment={
                "BOOKINGS_TABLE_NAME": bookings_table.table_name,
                "CARS_TABLE_NAME": cars_table.table_name,
                "NOTIFICATIONS_TABLE_NAME": notifications_table.table_name,
                "CONTENT_TABLE_NAME": content_table.table_name,
            },
        )
        bookings_table.grant_read_write_data(bookings_lambda)
        cars_table.grant_read_data(bookings_lambda)
        notifications_table.grant_read_write_data(bookings_lambda)
        content_table.grant_read_data(bookings_lambda)
        # Imported tables don't expose their GSIs to CDK, so grant index
        # access explicitly (bookings handler queries UserBookingsIndex and
        # CarBookingsIndex).
        for index in ("UserBookingsIndex", "CarBookingsIndex"):
            bookings_lambda.add_to_role_policy(
                iam.PolicyStatement(
                    actions=["dynamodb:Query", "dynamodb:Scan"],
                    resources=[
                        f"arn:aws:dynamodb:{self.region}:{self.account}:table/{bookings_table.table_name}/index/{index}"
                    ],
                )
            )
        bookings_lambda.add_to_role_policy(
            iam.PolicyStatement(
                actions=["dynamodb:Query"],
                resources=[
                    f"arn:aws:dynamodb:{self.region}:{self.account}:table/{content_table.table_name}/index/ContentTypeCreatedAtIndex"
                ],
            )
        )

        users_lambda = _lambda.Function(
            self,
            "UsersHandler",
            runtime=runtime,
            handler="handlers.users.handler",
            code=code,
            environment={
                "USERS_TABLE_NAME": users_table.table_name,
                "BOOKINGS_TABLE_NAME": bookings_table.table_name,
            },
        )
        users_table.grant_read_write_data(users_lambda)
        bookings_table.grant_read_data(users_lambda)
        # users handler enriches profiles by querying UserBookingsIndex
        users_lambda.add_to_role_policy(
            iam.PolicyStatement(
                actions=["dynamodb:Query", "dynamodb:Scan"],
                resources=[
                    f"arn:aws:dynamodb:{self.region}:{self.account}:table/{bookings_table.table_name}/index/UserBookingsIndex"
                ],
            )
        )

        uploads_lambda = _lambda.Function(
            self,
            "UploadsHandler",
            runtime=runtime,
            handler="handlers.uploads.handler",
            code=code,
            environment={"MEDIA_BUCKET_NAME": media_bucket.bucket_name},
        )
        media_bucket.grant_put(uploads_lambda)

        payments_lambda = _lambda.Function(
            self,
            "PaymentsHandler",
            runtime=runtime,
            handler="handlers.payments.handler",
            code=code,
            environment={
                "PAYMENTS_TABLE_NAME": payments_table.table_name,
                "BOOKINGS_TABLE_NAME": bookings_table.table_name,
                "NOTIFICATIONS_TABLE_NAME": notifications_table.table_name,
            },
        )
        payments_table.grant_read_write_data(payments_lambda)
        bookings_table.grant_read_write_data(payments_lambda)
        notifications_table.grant_read_write_data(payments_lambda)

        notifications_lambda = _lambda.Function(
            self,
            "NotificationsHandler",
            runtime=runtime,
            handler="handlers.notifications.handler",
            code=code,
            environment={"NOTIFICATIONS_TABLE_NAME": notifications_table.table_name},
        )
        notifications_table.grant_read_write_data(notifications_lambda)

        reviews_lambda = _lambda.Function(
            self,
            "ReviewsHandler",
            runtime=runtime,
            handler="handlers.reviews.handler",
            code=code,
            environment={
                "REVIEWS_TABLE_NAME": reviews_table.table_name,
                "BOOKINGS_TABLE_NAME": bookings_table.table_name,
            },
        )
        reviews_table.grant_read_write_data(reviews_lambda)
        bookings_table.grant_read_data(reviews_lambda)
        # reviews handler checks completed bookings via UserBookingsIndex
        reviews_lambda.add_to_role_policy(
            iam.PolicyStatement(
                actions=["dynamodb:Query", "dynamodb:Scan"],
                resources=[
                    f"arn:aws:dynamodb:{self.region}:{self.account}:table/{bookings_table.table_name}/index/UserBookingsIndex"
                ],
            )
        )

        stats_lambda = _lambda.Function(
            self,
            "AdminStatsHandler",
            runtime=runtime,
            handler="handlers.admin_stats.handler",
            code=code,
            environment={
                "CARS_TABLE_NAME": cars_table.table_name,
                "USERS_TABLE_NAME": users_table.table_name,
                "BOOKINGS_TABLE_NAME": bookings_table.table_name,
                "PAYMENTS_TABLE_NAME": payments_table.table_name,
                "REVIEWS_TABLE_NAME": reviews_table.table_name,
            },
        )
        cars_table.grant_read_data(stats_lambda)
        users_table.grant_read_data(stats_lambda)
        bookings_table.grant_read_data(stats_lambda)
        payments_table.grant_read_data(stats_lambda)
        reviews_table.grant_read_data(stats_lambda)

        content_lambda = _lambda.Function(
            self,
            "ContentHandler",
            runtime=runtime,
            handler="handlers.content.handler",
            code=code,
            environment={"CONTENT_TABLE_NAME": content_table.table_name},
        )
        content_table.grant_read_write_data(content_lambda)

        service_orders_lambda = _lambda.Function(
            self,
            "ServiceOrdersHandler",
            runtime=runtime,
            handler="handlers.service_orders.handler",
            code=code,
            environment={
                "SERVICE_ORDERS_TABLE_NAME": service_orders_table.table_name,
                "CONTENT_TABLE_NAME": content_table.table_name,
            },
        )
        service_orders_table.grant_read_write_data(service_orders_lambda)
        content_table.grant_read_data(service_orders_lambda)
        service_orders_lambda.add_to_role_policy(
            iam.PolicyStatement(
                actions=["dynamodb:Query"],
                resources=[
                    f"arn:aws:dynamodb:{self.region}:{self.account}:table/{service_orders_table.table_name}/index/UserServiceOrdersIndex"
                ],
            )
        )

        # ------------------------------------------------------------------
        # 5. API GATEWAY
        # ------------------------------------------------------------------
        authorizer = apigw.CognitoUserPoolsAuthorizer(
            self,
            "Authorizer",
            cognito_user_pools=[user_pool],
            authorizer_name="FullApiCognitoAuthorizer",
        )
        auth = {
            "authorization_type": apigw.AuthorizationType.COGNITO,
            "authorizer": authorizer,
        }

        api = apigw.RestApi(
            self,
            "FullApi",
            rest_api_name="Car Rental Full API",
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=apigw.Cors.ALL_ORIGINS,
                allow_methods=apigw.Cors.ALL_METHODS,
                allow_headers=[
                    "Content-Type",
                    "Authorization",
                    "X-Amz-Date",
                    "X-Api-Key",
                    "X-Amz-Security-Token",
                ],
            ),
        )

        cars_integration = apigw.LambdaIntegration(cars_lambda)
        bookings_integration = apigw.LambdaIntegration(bookings_lambda)
        users_integration = apigw.LambdaIntegration(users_lambda)
        uploads_integration = apigw.LambdaIntegration(uploads_lambda)
        payments_integration = apigw.LambdaIntegration(payments_lambda)
        notifications_integration = apigw.LambdaIntegration(notifications_lambda)
        reviews_integration = apigw.LambdaIntegration(reviews_lambda)
        stats_integration = apigw.LambdaIntegration(stats_lambda)
        content_integration = apigw.LambdaIntegration(content_lambda)
        service_orders_integration = apigw.LambdaIntegration(service_orders_lambda)

        # --- /cars --- (GET public; write admin-only enforced in Lambda)
        cars = api.root.add_resource("cars")
        cars.add_method("GET", cars_integration)
        cars.add_method("POST", cars_integration, **auth)
        car_item = cars.add_resource("{carId}")
        car_item.add_method("GET", cars_integration)
        car_item.add_method("PUT", cars_integration, **auth)
        car_item.add_method("DELETE", cars_integration, **auth)

        # --- /bookings --- (all authenticated; per-user scoping in Lambda)
        bookings = api.root.add_resource("bookings")
        bookings.add_method("GET", bookings_integration, **auth)
        bookings.add_method("POST", bookings_integration, **auth)
        booking_user = bookings.add_resource("{userId}")
        booking_user.add_method("GET", bookings_integration, **auth)
        booking_user.add_method("PUT", bookings_integration, **auth)
        booking_user.add_method("DELETE", bookings_integration, **auth)

        # --- /payments --- (all authenticated; per-user scoping in Lambda)
        payments = api.root.add_resource("payments")
        payments.add_method("GET", payments_integration, **auth)
        payments.add_method("POST", payments_integration, **auth)
        payment_item = payments.add_resource("{paymentId}")
        payment_item.add_method("GET", payments_integration, **auth)
        payment_item.add_method("PUT", payments_integration, **auth)

        # --- /notifications ---
        notifications = api.root.add_resource("notifications")
        notifications.add_method("GET", notifications_integration, **auth)
        notification_item = notifications.add_resource("{notificationId}")
        notification_item.add_method("GET", notifications_integration, **auth)
        notification_item.add_method("PUT", notifications_integration, **auth)
        notification_item.add_method("DELETE", notifications_integration, **auth)

        # --- /reviews --- (GET public by carId or reviewId; write authenticated)
        # API Gateway permits only one {variable} child; use a single {itemId}
        # and disambiguate in the Lambda by the "rev_" prefix.
        reviews = api.root.add_resource("reviews")
        reviews.add_method("POST", reviews_integration, **auth)
        review_item = reviews.add_resource("{itemId}")
        review_item.add_method("GET", reviews_integration)
        review_item.add_method("DELETE", reviews_integration, **auth)

        # --- /users --- (self + admin)
        users = api.root.add_resource("users")
        users.add_method("GET", users_integration, **auth)
        me = users.add_resource("me")
        me.add_method("GET", users_integration, **auth)
        me.add_method("PUT", users_integration, **auth)
        single_user = users.add_resource("{userId}")
        single_user.add_method("GET", users_integration, **auth)
        single_user.add_method("PUT", users_integration, **auth)

        # --- /admin/stats --- (admin only)
        admin = api.root.add_resource("admin")
        admin_stats = admin.add_resource("stats")
        admin_stats.add_method("GET", stats_integration, **auth)

        # --- /uploads/presigned-url --- (authenticated)
        uploads = api.root.add_resource("uploads")
        presigned = uploads.add_resource("presigned-url")
        presigned.add_method("POST", uploads_integration, **auth)

        # --- Publicly readable published content; management is admin-only in Lambda ---
        content = api.root.add_resource("content")
        content.add_method("GET", content_integration)
        content.add_method("POST", content_integration, **auth)
        content_item = content.add_resource("{contentId}")
        content_item.add_method("GET", content_integration)
        content_item.add_method("PUT", content_integration, **auth)
        content_item.add_method("DELETE", content_integration, **auth)

        # --- Customer service requests and admin order management ---
        service_orders = api.root.add_resource("service-orders")
        service_orders.add_method("GET", service_orders_integration, **auth)
        service_orders.add_method("POST", service_orders_integration, **auth)
        service_order = service_orders.add_resource("{orderId}")
        service_order.add_method("PUT", service_orders_integration, **auth)

        # ------------------------------------------------------------------
        # 6. OUTPUTS
        # ------------------------------------------------------------------
        CfnOutput(self, "ApiUrl", value=api.url, description="Full API Gateway endpoint URL")
        CfnOutput(self, "UserPoolId", value=user_pool.user_pool_id)
        CfnOutput(self, "UserPoolClientId", value=user_pool_client.user_pool_client_id)
        CfnOutput(self, "MediaBucketName", value=media_bucket.bucket_name)