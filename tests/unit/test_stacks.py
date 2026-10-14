import unittest
import aws_cdk as cdk
import aws_cdk.assertions as assertions

from car_rental_platform.database_stack import DatabaseStack
from car_rental_platform.api_stack import ApiStack


class TestCarRentalStacks(unittest.TestCase):
    def test_database_stack_resources(self):
        app = cdk.App()
        db_stack = DatabaseStack(app, "TestDatabaseStack")
        template = assertions.Template.from_stack(db_stack)

        # 3 DynamoDB tables should be created
        template.resource_count_is("AWS::DynamoDB::Table", 3)

        # Check CarRentalCars table
        template.has_resource_properties(
            "AWS::DynamoDB::Table",
            {
                "TableName": "CarRentalCars",
                "KeySchema": [{"AttributeName": "carId", "KeyType": "HASH"}],
            },
        )

        # Check CarRentalUsers table
        template.has_resource_properties(
            "AWS::DynamoDB::Table",
            {
                "TableName": "CarRentalUsers",
                "KeySchema": [{"AttributeName": "userId", "KeyType": "HASH"}],
            },
        )

        # Check CarRentalBookings table
        template.has_resource_properties(
            "AWS::DynamoDB::Table",
            {
                "TableName": "CarRentalBookings",
                "KeySchema": [{"AttributeName": "bookingId", "KeyType": "HASH"}],
            },
        )

    def test_api_stack_resources(self):
        app = cdk.App()
        db_stack = DatabaseStack(app, "TestDatabaseStack")
        api_stack = ApiStack(
            app,
            "TestApiStack",
            cars_table=db_stack.cars_table,
            users_table=db_stack.users_table,
            bookings_table=db_stack.bookings_table,
        )
        template = assertions.Template.from_stack(api_stack)

        # Verify Cognito User Pool and Client
        template.has_resource_properties(
            "AWS::Cognito::UserPool",
            {"UserPoolName": "CarRentalUserPool"},
        )
        template.has_resource_properties(
            "AWS::Cognito::UserPoolClient",
            {"ClientName": "CarRentalAppClient"},
        )

        # Verify S3 Media Bucket
        template.resource_count_is("AWS::S3::Bucket", 1)

        # Verify API Gateway RestApi
        template.has_resource_properties(
            "AWS::ApiGateway::RestApi",
            {"Name": "Car Rental API"},
        )

        # Verify our 4 microservice Lambda functions (plus 1 CDK S3 auto-delete custom resource lambda)
        template.has_resource_properties(
            "AWS::Lambda::Function",
            {"Handler": "handlers.cars.handler"},
        )
        template.has_resource_properties(
            "AWS::Lambda::Function",
            {"Handler": "handlers.bookings.handler"},
        )
        template.has_resource_properties(
            "AWS::Lambda::Function",
            {"Handler": "handlers.users.handler"},
        )
        template.has_resource_properties(
            "AWS::Lambda::Function",
            {"Handler": "handlers.uploads.handler"},
        )
        template.resource_count_is("AWS::Lambda::Function", 5)


if __name__ == "__main__":
    unittest.main()

