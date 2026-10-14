import os
from aws_cdk import (
    CfnOutput,
    RemovalPolicy,
    Stack,
    aws_apigateway as apigw,
    aws_cognito as cognito,
    aws_lambda as _lambda,
    aws_s3 as s3,
)
from constructs import Construct


class ApiStack(Stack):
    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        cars_table,
        users_table,
        bookings_table,
        **kwargs
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # -------------------------------------------------------------
        # 1. S3 BUCKET FOR CAR PHOTOS & UPLOADS
        # -------------------------------------------------------------
        self.media_bucket = s3.Bucket(
            self,
            "CarRentalMediaBucket",
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

        # -------------------------------------------------------------
        # 2. COGNITO USER POOL & AUTHORIZER
        # -------------------------------------------------------------
        self.user_pool = cognito.UserPool(
            self,
            "CarRentalUserPool",
            user_pool_name="CarRentalUserPool",
            self_sign_up_enabled=True,
            auto_verify=cognito.AutoVerifiedAttrs(email=True),
            sign_in_aliases=cognito.SignInAliases(email=True),
            custom_attributes={
                "role": cognito.StringAttribute(mutable=True),
            },
            standard_attributes=cognito.StandardAttributes(
                fullname=cognito.StandardAttribute(mutable=True, required=False),
                phone_number=cognito.StandardAttribute(mutable=True, required=False),
            ),
            removal_policy=RemovalPolicy.DESTROY,
        )

        self.user_pool_client = self.user_pool.add_client(
            "CarRentalAppClient",
            user_pool_client_name="CarRentalAppClient",
            auth_flows=cognito.AuthFlow(
                user_password=True,
                user_srp=True,
            ),
        )

        authorizer = apigw.CognitoUserPoolsAuthorizer(
            self,
            "CarRentalApiAuthorizer",
            cognito_user_pools=[self.user_pool],
        )

        # -------------------------------------------------------------
        # 3. API GATEWAY SETUP
        # -------------------------------------------------------------
        self.api = apigw.RestApi(
            self,
            "CarRentalApi",
            rest_api_name="Car Rental API",
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

        # Common Lambda configuration
        backend_dir = os.path.join(os.path.dirname(__file__), "..", "Backend")
        lambda_code = _lambda.Code.from_asset(backend_dir)
        lambda_runtime = _lambda.Runtime.PYTHON_3_11

        # -------------------------------------------------------------
        # 4. LAMBDA MICROSERVICES
        # -------------------------------------------------------------
        # A. Cars Handler
        cars_lambda = _lambda.Function(
            self,
            "CarsHandler",
            runtime=lambda_runtime,
            handler="handlers.cars.handler",
            code=lambda_code,
            environment={
                "CARS_TABLE_NAME": cars_table.table_name,
            },
        )
        cars_table.grant_read_write_data(cars_lambda)

        # B. Bookings Handler
        bookings_lambda = _lambda.Function(
            self,
            "BookingsHandler",
            runtime=lambda_runtime,
            handler="handlers.bookings.handler",
            code=lambda_code,
            environment={
                "BOOKINGS_TABLE_NAME": bookings_table.table_name,
                "CARS_TABLE_NAME": cars_table.table_name,
            },
        )
        bookings_table.grant_read_write_data(bookings_lambda)
        cars_table.grant_read_data(bookings_lambda)

        # C. Users Profile Handler
        users_lambda = _lambda.Function(
            self,
            "UsersHandler",
            runtime=lambda_runtime,
            handler="handlers.users.handler",
            code=lambda_code,
            environment={
                "USERS_TABLE_NAME": users_table.table_name,
            },
        )
        users_table.grant_read_write_data(users_lambda)

        # D. Uploads Presigned URL Handler
        uploads_lambda = _lambda.Function(
            self,
            "UploadsHandler",
            runtime=lambda_runtime,
            handler="handlers.uploads.handler",
            code=lambda_code,
            environment={
                "MEDIA_BUCKET_NAME": self.media_bucket.bucket_name,
            },
        )
        self.media_bucket.grant_put(uploads_lambda)

        # -------------------------------------------------------------
        # 5. REST API ROUTES
        # -------------------------------------------------------------
        cars_integration = apigw.LambdaIntegration(cars_lambda)
        bookings_integration = apigw.LambdaIntegration(bookings_lambda)
        users_integration = apigw.LambdaIntegration(users_lambda)
        uploads_integration = apigw.LambdaIntegration(uploads_lambda)

        # --- /cars routes ---
        cars_resource = self.api.root.add_resource("cars")
        cars_resource.add_method("GET", cars_integration)  # Public: catalog browsing
        cars_resource.add_method(
            "POST",
            cars_integration,
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )

        single_car_resource = cars_resource.add_resource("{carId}")
        single_car_resource.add_method("GET", cars_integration)  # Public: car details
        single_car_resource.add_method(
            "PUT",
            cars_integration,
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )
        single_car_resource.add_method(
            "DELETE",
            cars_integration,
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )

        # --- /bookings routes ---
        bookings_resource = self.api.root.add_resource("bookings")
        bookings_resource.add_method(
            "GET",
            bookings_integration,
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )
        bookings_resource.add_method(
            "POST",
            bookings_integration,
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )

        single_booking_resource = bookings_resource.add_resource("{userId}")
        single_booking_resource.add_method(
            "GET",
            bookings_integration,
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )
        single_booking_resource.add_method(
            "PUT",
            bookings_integration,
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )
        single_booking_resource.add_method(
            "DELETE",
            bookings_integration,
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )

        # Backwards-compatible /bookings/{userId} route
        # Handled naturally by {bookingId} parameter handler which also inspects userId

        # --- /users/me routes ---
        users_resource = self.api.root.add_resource("users")
        me_resource = users_resource.add_resource("me")
        me_resource.add_method(
            "GET",
            users_integration,
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )
        me_resource.add_method(
            "PUT",
            users_integration,
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )

        # --- /uploads/presigned-url route ---
        uploads_resource = self.api.root.add_resource("uploads")
        presigned_resource = uploads_resource.add_resource("presigned-url")
        presigned_resource.add_method(
            "POST",
            uploads_integration,
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )

        # -------------------------------------------------------------
        # 6. STACK OUTPUTS
        # -------------------------------------------------------------
        CfnOutput(self, "ApiUrlOutput", value=self.api.url, description="API Gateway Endpoint URL")
        CfnOutput(self, "UserPoolIdOutput", value=self.user_pool.user_pool_id, description="Cognito User Pool ID")
        CfnOutput(self, "UserPoolClientIdOutput", value=self.user_pool_client.user_pool_client_id, description="Cognito Client ID")
        CfnOutput(self, "MediaBucketOutput", value=self.media_bucket.bucket_name, description="S3 Media Bucket Name")