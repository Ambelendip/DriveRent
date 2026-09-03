# DriveRent — Car Rental Platform Frontend

React + Vite frontend connected to:
- Amazon Cognito for authentication
- API Gateway + Lambda for REST APIs
- DynamoDB through the backend API
- S3 for car image uploads through presigned URLs
- CloudFront/S3 for production frontend hosting

## 1. Install

```bash
npm install
```

## 2. Configure

Copy `.env.example` to `.env` and fill in the values exported by your CDK deployment:

```env
VITE_API_URL=https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/prod
VITE_AWS_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxx
VITE_COGNITO_CLIENT_ID=xxxxx
VITE_S3_UPLOAD_PATH=cars
```

Do not put AWS secret access keys in `.env` or frontend code. Browser applications must never contain IAM secret keys.

## 3. Expected API contract

The frontend expects these routes:

### Cars
- GET `/cars`
- GET `/cars/{carId}`
- POST `/cars`
- PUT `/cars/{carId}`
- DELETE `/cars/{carId}`

### Bookings
- GET `/bookings`
- GET `/bookings/{bookingId}`
- POST `/bookings`
- PUT `/bookings/{bookingId}`
- DELETE `/bookings/{bookingId}`

### User
- GET `/users/me`
- PUT `/users/me`

### Uploads
- POST `/uploads/presigned-url`

The upload endpoint should return something similar to:

```json
{
  "uploadUrl": "https://...",
  "fileUrl": "https://..."
}
```

The backend should validate the Cognito JWT and enforce customer/admin authorization.

## 4. Run

```bash
npm run dev
```

## 5. Build

```bash
npm run build
```

The `dist/` folder can then be deployed to the S3 bucket behind CloudFront.

## Important backend alignment

If your deployed API uses different paths or response field names, update `src/services/api.js` and the affected page components. The frontend deliberately keeps the AWS integration in the service layer so it is easy to adapt to your existing CDK/Lambda API.
