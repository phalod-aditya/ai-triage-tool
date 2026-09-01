const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";


async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = "Something went wrong. Please try again.";
    try {
      const body = await response.json();
      if (typeof body.detail === "string") {
        message = body.detail;
      }
    } catch {
      // Keep the user-friendly fallback when the response is not JSON.
    }
    throw new Error(message);
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
