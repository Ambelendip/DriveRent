import { config } from "../config";
import { getIdToken } from "./auth";

async function request(path, options = {}) {
  const token = await getIdToken();
  const headers = new Headers(options.headers || {});

  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${config.apiUrl}${path}`, {
    ...options,
    headers
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      (typeof data === "string" ? data : "Request failed");
    throw new Error(message);
  }

  return data;
}

export const api = {
  getCars: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") query.set(k, v);
    });
    return request(`/cars${query.toString() ? `?${query}` : ""}`);
  },

  getCar: (id) => request(`/cars/${encodeURIComponent(id)}`),

  createCar: (car) =>
    request("/cars", { method: "POST", body: JSON.stringify(car) }),

  updateCar: (id, car) =>
    request(`/cars/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(car)
    }),

  deleteCar: (id) =>
    request(`/cars/${encodeURIComponent(id)}`, { method: "DELETE" }),

  getBookings: () => request("/bookings"),

  getBooking: (id) =>
    request(`/bookings/${encodeURIComponent(id)}`),

  createBooking: (booking) =>
    request("/bookings", {
      method: "POST",
      body: JSON.stringify(booking)
    }),

  updateBooking: (id, data) =>
    request(`/bookings/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(data)
    }),

  cancelBooking: (id) =>
    request(`/bookings/${encodeURIComponent(id)}`, {
      method: "DELETE"
    }),

  getProfile: () => request("/users/me"),

  updateProfile: (profile) =>
    request("/users/me", {
      method: "PUT",
      body: JSON.stringify(profile)
    }),

  createUploadUrl: (payload) =>
    request("/uploads/presigned-url", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  // ---- Payments ----
  getPayments: () => request("/payments"),

  createPayment: (payload) =>
    request("/payments", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  refundPayment: (id) =>
    request(`/payments/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ status: "REFUNDED" })
    }),

  // ---- Notifications ----
  getNotifications: () => request("/notifications"),

  markNotificationRead: (id) =>
    request(`/notifications/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ read: true })
    }),

  deleteNotification: (id) =>
    request(`/notifications/${encodeURIComponent(id)}`, { method: "DELETE" }),

  // ---- Reviews ----
  getReviews: (carId) => request(`/reviews/${encodeURIComponent(carId)}`),

  getContent: (type) =>
    request(`/content${type ? `?type=${encodeURIComponent(type)}` : ""}`),

  getContentItem: (id) => request(`/content/${encodeURIComponent(id)}`),

  createContent: (payload) =>
    request("/content", { method: "POST", body: JSON.stringify(payload) }),

  updateContent: (id, payload) =>
    request(`/content/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),

  deleteContent: (id) =>
    request(`/content/${encodeURIComponent(id)}`, { method: "DELETE" }),

  getServiceOrders: () => request("/service-orders"),

  createServiceOrder: (payload) =>
    request("/service-orders", { method: "POST", body: JSON.stringify(payload) }),

  updateServiceOrder: (id, payload) =>
    request(`/service-orders/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),

  createReview: (payload) =>
    request("/reviews", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  deleteReview: (id) =>
    request(`/reviews/${encodeURIComponent(id)}`, { method: "DELETE" }),

  // ---- Admin ----
  listUsers: () => request("/users"),

  updateUser: (userId, data) =>
    request(`/users/${encodeURIComponent(userId)}`, {
      method: "PUT",
      body: JSON.stringify(data)
    }),

  getAdminStats: () => request("/admin/stats")
};

export async function uploadToS3(presignedUrl, file) {
  const response = await fetch(presignedUrl, {
    method: "PUT",
    headers: {
      // Must match the Content-Type the presigned URL was signed with
      // (see Backend/handlers/uploads.py), otherwise S3 rejects the PUT
      // with SignatureDoesNotMatch.
      "Content-Type": file.type || "image/jpeg"
    },
    body: file
  });

  if (!response.ok) throw new Error("S3 upload failed");
  return true;
}
