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
    })
};

export async function uploadToS3(presignedUrl, file) {
  const response = await fetch(presignedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type
    },
    body: file
  });

  if (!response.ok) throw new Error("S3 upload failed");
  return true;
}