from aws_cdk import (
    Stack,
    aws_lambda as _lambda,
    aws_apigateway as apigw,
    aws_cognito as cognito,
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
        # 1. COGNITO USER POOL & AUTHORIZER
        # -------------------------------------------------------------
        self.user_pool = cognito.UserPool(
            self, "CarRentalUserPool",
            user_pool_name="CarRentalUserPool",
            self_sign_up_enabled=True,
            auto_verify=cognito.AutoVerifiedAttrs(email=True),
            sign_in_aliases=cognito.SignInAliases(email=True)
        )

        self.user_pool_client = self.user_pool.add_client(
            "CarRentalAppClient",
            user_pool_client_name="CarRentalAppClient"
        )

        authorizer = apigw.CognitoUserPoolsAuthorizer(
            self, "CarRentalApiAuthorizer",
            cognito_user_pools=[self.user_pool]
        )

        # -------------------------------------------------------------
        # 2. API GATEWAY SETUP
        # -------------------------------------------------------------
        self.api = apigw.RestApi(
            self, "CarRentalApi",
            rest_api_name="Car Rental API",
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=apigw.Cors.ALL_ORIGINS,
                allow_methods=apigw.Cors.ALL_METHODS
            )
        )

        # -------------------------------------------------------------
        # 3. SECURED ENDPOINTS
        # -------------------------------------------------------------
        # Create Booking Handler
        create_booking_lambda = _lambda.Function(
            self, "CreateBookingHandler",
            runtime=_lambda.Runtime.PYTHON_3_11,
            handler="create_booking.handler",
            code=_lambda.Code.from_asset("backend"),
            environment={"BOOKINGS_TABLE_NAME": bookings_table.table_name}
        )
        bookings_table.grant_read_write_data(create_booking_lambda)

        # Get User Bookings Handler
        get_user_bookings_lambda = _lambda.Function(
            self, "GetUserBookingsHandler",
            runtime=_lambda.Runtime.PYTHON_3_11,
            handler="get_user_bookings.handler",
            code=_lambda.Code.from_asset("backend"),
            environment={"BOOKINGS_TABLE_NAME": bookings_table.table_name}
        )
        bookings_table.grant_read_data(get_user_bookings_lambda)

        # Apply Authorizer to Routes
        bookings_resource = self.api.root.add_resource("bookings")
        bookings_resource.add_method(
            "POST", 
            apigw.LambdaIntegration(create_booking_lambda),
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO
        )

        user_bookings_resource = bookings_resource.add_resource("{userId}")
        user_bookings_resource.add_method(
            "GET", 
            apigw.LambdaIntegration(get_user_bookings_lambda),
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO
        )