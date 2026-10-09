import axios from "axios";

// Route CBT requests through the SAME Axios helper and server host as OSCE.
// REACT_APP_SERVER_SCRIPT_HOST normally ends in /api/v1/osce.
const osceBase = (process.env.REACT_APP_SERVER_SCRIPT_HOST || "http://localhost:5000/api/v1/osce").replace(/\/$/, "");
const cbtBase = osceBase.replace(/\/api\/v1\/osce$/, "/api/v1/cbt");
const base = cbtBase === osceBase ? `${osceBase.replace(/\/osce$/, "")}/cbt` : cbtBase;
// Existing apiFetch is kept unchanged; direct URL here prevents OSCE endpoint crossover.

export async function cbtFetch(path, { token, method = "GET", body, signal } = {}) {
  try {
    const response = await axios({ url: `${base}/${path}`, method, data: method === "POST" ? (body || {}) : undefined,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, signal });
    return response.data;
  } catch (error) {
    if (error.code === "ERR_NETWORK") throw Object.assign(new Error("Network unavailable — working offline."), { status: 0 });
    throw Object.assign(new Error(error.response?.data?.message || error.message || "Request failed."), { status: error.response?.status || 0 });
  }
}
export const getCbtSettings = () => cbtFetch("public/settings");
export const getCbtCandidate = token => cbtFetch("candidate/exam", { token });
export const startCbtCandidate = token => cbtFetch("candidate/start", { token, method: "POST" });
export const sendCbtAnswers = (token, body) => cbtFetch("candidate/answer", { token, method: "POST", body });
export const submitCbt = (token, body) => cbtFetch("candidate/submit", { token, method: "POST", body });
export const getCbtAdmin = token => cbtFetch("admin/data", { token });
export const actionCbtAdmin = (token, body) => cbtFetch("admin/action", { token, method: "POST", body });
export const getCbtExaminer = token => cbtFetch("examiner/data", { token });

export const loginCbt = body => cbtFetch("auth/login", { method: "POST", body });
export const logoutCbt = token => cbtFetch("auth/logout", { token, method: "POST" });
