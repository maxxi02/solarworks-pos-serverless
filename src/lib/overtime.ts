/**
 * overtime.ts — Centralized overtime computation utilities
 *
 * Business Rules:
 *  - Daily work quota : 9 hours
 *  - OT buffer        : 1 hour  (staff must work ≥ 10h before any OT is earned)
 *  - OT threshold     : ≥ 10 hours  (the moment the 10th hour is completed)
 *  - OT hours         : floor-based, whole hours counted from the 10th hour
 *
 *  9h       → 0 OT
 *  9h 59m   → 0 OT
 *  10h      → 1 OT   ← first overtime hour
 *  10h 30m  → 1 OT
 *  11h      → 2 OT
 *  12h      → 3 OT
 */

/** Standard daily work quota in hours */
export const DAILY_QUOTA_HOURS = 9;

/**
 * Buffer added on top of the quota before overtime kicks in.
 * Effective OT threshold = DAILY_QUOTA_HOURS + OT_BUFFER_HOURS
 */
export const OT_BUFFER_HOURS = 1;

/** Total hours worked before any overtime is counted (9 + 1 = 10) */
export const OT_THRESHOLD_HOURS = DAILY_QUOTA_HOURS + OT_BUFFER_HOURS;

/**
 * Compute overtime hours from total hours worked.
 *
 * Rules:
 *  - No OT if hoursWorked < OT_THRESHOLD_HOURS (10h)
 *  - OT = floor(hoursWorked - DAILY_QUOTA_HOURS)
 *    (every completed hour beyond the 9h quota, starting from the 10th hour)
 *
 * Examples:
 *   9h        → 0 OT
 *   9h 59m    → 0 OT  (9.98h < 10 → 0)
 *   10h       → 1 OT  (floor(10 - 9) = 1)
 *   10h 30m   → 1 OT  (floor(10.5 - 9) = 1)
 *   11h       → 2 OT  (floor(11 - 9) = 2)
 *   12h       → 3 OT  (floor(12 - 9) = 3)
 *
 * @param hoursWorked - Raw decimal hours worked (e.g. 10.5)
 * @returns Integer overtime hours (floor-based)
 */
export function computeOvertimeHours(hoursWorked: number): number {
  if (hoursWorked < OT_THRESHOLD_HOURS) return 0;
  return Math.floor(hoursWorked - DAILY_QUOTA_HOURS);
}

/**
 * Returns true when the staff member has reached or passed the OT threshold,
 * triggering the overtime confirmation prompt on clock-out.
 *
 * Uses >= so the prompt fires the moment they hit exactly 10 hours.
 *
 * @param elapsedHours - Hours elapsed since clock-in (decimal)
 */
export function hasReachedOvertimeThreshold(elapsedHours: number): boolean {
  return elapsedHours >= OT_THRESHOLD_HOURS;
}

/**
 * Breaks total hours worked into regular and overtime components.
 *
 * @param hoursWorked  - Total hours worked (decimal)
 * @returns { regularHours, overtimeHours }
 *    regularHours  = min(hoursWorked, DAILY_QUOTA_HOURS)  (capped at quota)
 *    overtimeHours = computeOvertimeHours(hoursWorked)    (whole hours only)
 */
export function splitRegularAndOvertime(hoursWorked: number): {
  regularHours: number;
  overtimeHours: number;
} {
  const regularHours = Math.min(hoursWorked, DAILY_QUOTA_HOURS);
  const overtimeHours = computeOvertimeHours(hoursWorked);
  return { regularHours, overtimeHours };
}
