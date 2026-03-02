const SOCKET_SERVER_URL =
  process.env.NEXT_PUBLIC_SOCKET_SERVER_URL ||
  "https://rendezvous-server-gpmv.onrender.com";
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || "";

const notify = async (endpoint: string, body?: Record<string, any>) => {
  try {
    await fetch(`${SOCKET_SERVER_URL}/internal/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": INTERNAL_SECRET,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    // Non-critical — never fail the main action
    console.warn(`[notifyServer] Failed to notify /${endpoint}:`, err);
  }
};

export const notifyCashUpdated = () => notify("cash-updated");
export const notifySalesUpdated = () => notify("sales-updated");
export const notifyRegisterClosed = (data: {
  cashierName: string;
  registerName: string;
  closedAt: string;
}) => notify("register-closed", data);
