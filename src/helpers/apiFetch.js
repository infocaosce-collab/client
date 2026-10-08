import axios from "axios";

/** Shared OSCE Axios helper using the configured React server host. */
export async function apiFetch(path, opts = {}) {
  const BASE_URL = process.env.REACT_APP_SERVER_SCRIPT_HOST || "http://localhost:5000/api/v1/osce";
  const headers = { "Content-Type": "application/json" };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  try {
    const response = await axios({
      url: `${BASE_URL}/${path}`,
      method: opts.method || "GET",
      data: (opts.method || "GET") === "POST" ? (opts.body ?? {}) : undefined,
      headers: { ...headers, ...(opts.init?.headers || {}) },
      signal: opts.init?.signal,
    });
    return response.data;
  } catch (error) {
    if (error.code === "ERR_NETWORK") {
      throw Object.assign(new Error("Network unavailable — working offline."), { status: 0 });
    }
    const status = error.response?.status || 0;
    const message = error.response?.data?.message || error.response?.data?.error || error.message || "Request failed";
    throw Object.assign(new Error(message), { status });
  }
}
