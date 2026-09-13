const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

async function request(path, options = {}) {
  const token = localStorage.getItem("task-manager-token");
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem("task-manager-token");
      window.dispatchEvent(new Event("auth-expired"));
    }
    const message = body?.error || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return body;
}

export function register(email, password) {
  return request("/auth/register", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function login(email, password) {
  return request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function getTasks() {
  return request("/tasks");
}

export function createTask(task) {
  return request("/tasks", {
    method: "POST",
    body: JSON.stringify(task),
  });
}

export function updateTask(id, updates) {
  return request(`/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export function deleteTask(id) {
  return request(`/tasks/${id}`, { method: "DELETE" });
}
