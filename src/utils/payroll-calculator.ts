/**
 * Payroll calculation utilities
 * Handles regular hours, overtime, and earnings estimation
 */

import {
  DAILY_QUOTA_HOURS,
  OT_THRESHOLD_HOURS,
  splitRegularAndOvertime,
} from "@/lib/overtime";

export interface PayrollConfig {
  salaryPerHour: number;
  overtimeMultiplier?: number; // Default 1.5x
  weekendMultiplier?: number; // Default 2x
}

export interface WorkPeriod {
  date: Date;
  hoursWorked: number;
  isWeekend?: boolean;
  isHoliday?: boolean;
}

export interface EarningsBreakdown {
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  totalPay: number;
  effectiveRate: number; // Average rate per hour
}

// Re-export DAILY_QUOTA_HOURS as STANDARD_WORKDAY_HOURS for backward compatibility
export const STANDARD_WORKDAY_HOURS = DAILY_QUOTA_HOURS; // 9 hours

/**
 * Overtime threshold (quota + 1h buffer = 10h).
 * Exported so callers can reference it without importing from lib/overtime directly.
 */
export { OT_THRESHOLD_HOURS };

/**
 * Calculate earnings for a single work period.
 *
 * OT rules:
 *  - Regular hours capped at DAILY_QUOTA_HOURS (9h)
 *  - OT applies only after OT_THRESHOLD_HOURS (10h = 9h + 1h buffer)
 *  - OT hours are whole numbers only (floor-based)
 */
export function calculateEarnings(
  config: PayrollConfig,
  period: WorkPeriod,
): EarningsBreakdown {
  const {
    salaryPerHour,
    overtimeMultiplier = 1.5,
    weekendMultiplier = 2,
  } = config;
  const { hoursWorked, isWeekend, isHoliday } = period;

  // Determine multiplier based on day type
  const baseMultiplier = isWeekend || isHoliday ? weekendMultiplier : 1;

  // Split into regular and overtime using centralized rules
  const { regularHours, overtimeHours } = splitRegularAndOvertime(hoursWorked);

  const regularPay = regularHours * salaryPerHour * baseMultiplier;
  const overtimePay =
    overtimeHours * salaryPerHour * overtimeMultiplier * baseMultiplier;

  const totalPay = regularPay + overtimePay;
  const effectiveRate = hoursWorked > 0 ? totalPay / hoursWorked : 0;

  return {
    regularHours,
    overtimeHours,
    regularPay: Math.round(regularPay * 100) / 100,
    overtimePay: Math.round(overtimePay * 100) / 100,
    totalPay: Math.round(totalPay * 100) / 100,
    effectiveRate: Math.round(effectiveRate * 100) / 100,
  };
}

/**
 * Calculate total earnings for multiple work periods
 */
export function calculateTotalEarnings(
  config: PayrollConfig,
  periods: WorkPeriod[],
): EarningsBreakdown {
  const totals = periods.reduce(
    (acc, period) => {
      const breakdown = calculateEarnings(config, period);
      return {
        regularHours: acc.regularHours + breakdown.regularHours,
        overtimeHours: acc.overtimeHours + breakdown.overtimeHours,
        regularPay: acc.regularPay + breakdown.regularPay,
        overtimePay: acc.overtimePay + breakdown.overtimePay,
        totalPay: acc.totalPay + breakdown.totalPay,
        effectiveRate: 0, // Will calculate after
      };
    },
    {
      regularHours: 0,
      overtimeHours: 0,
      regularPay: 0,
      overtimePay: 0,
      totalPay: 0,
      effectiveRate: 0,
    },
  );

  const totalHours = totals.regularHours + totals.overtimeHours;
  totals.effectiveRate =
    totalHours > 0 ? Math.round((totals.totalPay / totalHours) * 100) / 100 : 0;

  return totals;
}

/**
 * Format currency in PHP
 */
export function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Check if date is weekend
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

/**
 * Estimate monthly earnings based on standard schedule
 * Assumes 5-day workweek, 8 hours/day
 */
export function estimateMonthlyEarnings(salaryPerHour: number): number {
  const workingDaysPerMonth = 22; // Average
  const hoursPerDay = 9;
  return salaryPerHour * hoursPerDay * workingDaysPerMonth;
}
