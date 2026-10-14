import os
from aws_cdk import (
    CfnOutput,
    Duration,
    RemovalPolicy,
    Stack,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    aws_s3 as s3,
    aws_s3_deployment as s3deploy,
)
from constructs import Construct


class FrontendStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        account = self.account

        # -------------------------------------------------------------
        # 1. WEB HOSTING BUCKET
        # -------------------------------------------------------------
        web_bucket = s3.Bucket(
            self,
            "WebBucket",
            bucket_name=f"carrental-platform-web-{account}",
            versioned=False,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            public_read_access=False,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
        )

        # Origin access identity restricts access to CloudFront only
        origin_access_identity = cloudfront.OriginAccessIdentity(
            self,
            "WebOriginAccessIdentity",
            comment="Car rental frontend CloudFront OAI",
        )
        web_bucket.grant_read(origin_access_identity)

        # -------------------------------------------------------------
        # 2. CLOUDFRONT DISTRIBUTION (SPA support)
        # -------------------------------------------------------------
        distribution = cloudfront.Distribution(
            self,
            "WebDistribution",
            comment="Car Rental Platform frontend",
            default_root_object="index.html",
            price_class=cloudfront.PriceClass.PRICE_CLASS_100,
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3Origin(
                    web_bucket,
                    origin_access_identity=origin_access_identity,
                ),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cache_policy=cloudfront.CachePolicy.CACHING_OPTIMIZED,
            ),
            error_responses=[
                # SPA fallback: any missing route serves index.html so React Router works
                cloudfront.ErrorResponse(
                    http_status=403,
                    response_http_status=200,
                    response_page_path="/index.html",
                    ttl=Duration.seconds(0),
                ),
                cloudfront.ErrorResponse(
                    http_status=404,
                    response_http_status=200,
                    response_page_path="/index.html",
                    ttl=Duration.seconds(0),
                ),
            ],
        )

        # -------------------------------------------------------------
        # 3. DEPLOY FRONTEND BUILD TO BUCKET + INVALIDATE CACHE
        # -------------------------------------------------------------
        frontend_build_dir = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), "Frontend", "dist"
        )

        s3deploy.BucketDeployment(
            self,
            "DeployWebApp",
            sources=[s3deploy.Source.asset(frontend_build_dir)],
            destination_bucket=web_bucket,
            prune=True,
            distribution=distribution,
            distribution_paths=["/*"],
        )

        # -------------------------------------------------------------
        # 4. STACK OUTPUTS
        # -------------------------------------------------------------
        CfnOutput(
            self,
            "WebUrl",
            value=distribution.distribution_domain_name,
            description="CloudFront website URL",
        )
        CfnOutput(
            self,
            "WebBucketName",
            value=web_bucket.bucket_name,
            description="S3 bucket hosting the frontend",
        )