export const config = {
  apiUrl: (import.meta.env.VITE_API_URL || "").replace(/\/$/, ""),
  awsRegion: import.meta.env.VITE_AWS_REGION || "",
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || "",
  clientId: import.meta.env.VITE_COGNITO_CLIENT_ID || "",
  uploadPath: import.meta.env.VITE_S3_UPLOAD_PATH || "cars"
};

export function validateConfig() {
  const missing = [];
  if (!config.apiUrl) missing.push("VITE_API_URL");
  if (!config.userPoolId) missing.push("VITE_COGNITO_USER_POOL_ID");
  if (!config.clientId) missing.push("VITE_COGNITO_CLIENT_ID");
  if (missing.length) console.warn("Missing environment variables:", missing.join(", "));
}