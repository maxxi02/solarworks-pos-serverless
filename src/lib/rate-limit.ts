import { NextRequest, NextResponse } from "next/server";

interface RateLimitConfig {
  windowMs: number;
  max: number;
  keyPrefix: string;
}

interface StoreEntry {
  count: number;
  resetAt: number;
}

// In-memory store — swap for Redis (@upstash/redis) in production
const store = new Map<string, StoreEntry>();

export function rateLimit(
  req: NextRequest,
  config: RateLimitConfig,
  userId?: string
): { success: boolean; response?: NextResponse } {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const identifier = userId ?? ip;
  const key = `${config.keyPrefix}:${identifier}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { success: true };
  }

  entry.count++;

  if (entry.count > config.max) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      success: false,
      response: NextResponse.json(
        { success: false, message: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(config.max),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(entry.resetAt / 1000)),
          },
        }
      ),
    };
  }

  return { success: true };
}

export const LIMITS: Record<string, RateLimitConfig> = {
  adminPin:       { windowMs: Number(process.env.RL_ADMIN_PIN_WINDOW_MS)       || 5 * 60 * 1000,       max: Number(process.env.RL_ADMIN_PIN_MAX)       || 5,  keyPrefix: "rl:admin-pin" },
  refund:         { windowMs: Number(process.env.RL_REFUND_WINDOW_MS)          || 5 * 60 * 1000,       max: Number(process.env.RL_REFUND_MAX)          || 5,  keyPrefix: "rl:refund" },
  paymongoSource: { windowMs: Number(process.env.RL_PAYMONGO_WINDOW_MS)        || 60 * 1000,           max: Number(process.env.RL_PAYMONGO_MAX)        || 10, keyPrefix: "rl:paymongo" },
  upload:         { windowMs: Number(process.env.RL_UPLOAD_WINDOW_MS)          || 60 * 1000,           max: Number(process.env.RL_UPLOAD_MAX)          || 10, keyPrefix: "rl:upload" },
  createUser:     { windowMs: Number(process.env.RL_CREATE_USER_WINDOW_MS)     || 60 * 60 * 1000,      max: Number(process.env.RL_CREATE_USER_MAX)     || 20, keyPrefix: "rl:create-user" },
  kioskOrder:     { windowMs: Number(process.env.RL_KIOSK_ORDER_WINDOW_MS)     || 60 * 1000,           max: Number(process.env.RL_KIOSK_ORDER_MAX)     || 5,  keyPrefix: "rl:kiosk-order" },
  aiCompanion:    { windowMs: Number(process.env.RL_AI_COMPANION_WINDOW_MS)    || 60 * 1000,           max: Number(process.env.RL_AI_COMPANION_MAX)    || 20, keyPrefix: "rl:ai-companion" },
  analytics:      { windowMs: Number(process.env.RL_ANALYTICS_WINDOW_MS)       || 60 * 1000,           max: Number(process.env.RL_ANALYTICS_MAX)       || 30, keyPrefix: "rl:analytics" },
  reports:        { windowMs: Number(process.env.RL_REPORTS_WINDOW_MS)         || 60 * 1000,           max: Number(process.env.RL_REPORTS_MAX)         || 10, keyPrefix: "rl:reports" },
  search:         { windowMs: Number(process.env.RL_SEARCH_WINDOW_MS)          || 60 * 1000,           max: Number(process.env.RL_SEARCH_MAX)          || 30, keyPrefix: "rl:search" },
  batchAdjust:    { windowMs: Number(process.env.RL_BATCH_ADJUST_WINDOW_MS)    || 60 * 1000,           max: Number(process.env.RL_BATCH_ADJUST_MAX)    || 20, keyPrefix: "rl:batch-adjust" },
  leaveSubmit:    { windowMs: Number(process.env.RL_LEAVE_SUBMIT_WINDOW_MS)    || 60 * 60 * 1000,      max: Number(process.env.RL_LEAVE_SUBMIT_MAX)    || 5,  keyPrefix: "rl:leave-submit" },
  overtimeSubmit: { windowMs: Number(process.env.RL_OVERTIME_SUBMIT_WINDOW_MS) || 60 * 60 * 1000,      max: Number(process.env.RL_OVERTIME_SUBMIT_MAX) || 5,  keyPrefix: "rl:overtime-submit" },
};
