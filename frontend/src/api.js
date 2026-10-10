export const getToken = () => localStorage.getItem("token") || sessionStorage.getItem("token");

export async function api(path, opts = {}) {
  const token = getToken();
  let res;
  try {
    res = await fetch("/api" + path, {
      method: opts.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new Error("Network error. Is the backend running?");
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    localStorage.removeItem("mindcare_user");
    // Only redirect to login if attempting a protected resource (not public routes or landing checks)
    if (!path.startsWith("/public") && window.location.pathname !== "/login" && window.location.pathname !== "/") {
      window.location.href = "/login";
    }
  }
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}
