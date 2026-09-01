const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";


export class ApiError extends Error {
  constructor(message, status, details = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}


async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError("Unable to reach the server. Please try again.", 0);
  }

  if (!response.ok) {
    let detail = "";
    let details = [];
    try {
      const body = await response.json();
      if (typeof body.detail === "string") detail = body.detail;
      if (Array.isArray(body.detail)) details = body.detail;
    } catch {
      // Use a safe fallback when the response is not JSON.
    }

    const message =
      response.status === 502 && detail
        ? detail
        : response.status < 500 && detail
          ? detail
          : "The server could not complete the request. Please try again.";
    throw new ApiError(message, response.status, details);
  }

  return response.json();
}


export function getIntakes() {
  return request("/api/intakes");
}


export function getIntake(id) {
  return request(`/api/intakes/${id}`);
}


export function createIntake(data) {
  return request("/api/intakes", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
