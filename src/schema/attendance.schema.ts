// schema/attendance.schema.ts

import { z } from "zod";

export enum AttendanceStatus {
  PENDING_CHECKIN   = "PENDING_CHECKIN",
  CLOCKED_IN        = "CLOCKED_IN",
  PENDING_CHECKOUT  = "PENDING_CHECKOUT",
  CLOCKED_OUT       = "CLOCKED_OUT",
  REJECTED          = "REJECTED",
  CANCELLED         = "CANCELLED",     // optional — if staff cancels request
}

export const AttendanceSchema = z.object({
  _id: z.string().optional(),           // MongoDB _id

  userId: z.string(),

  requestedCheckInAt:  z.date().optional(),
  approvedCheckInAt:   z.date().optional(),
  checkInLocation:     z.object({
    latitude:  z.number(),
    longitude: z.number(),
  }).optional(),

  requestedCheckOutAt: z.date().optional(),
  approvedCheckOutAt:  z.date().optional(),
  checkOutLocation:    z.object({
    latitude:  z.number(),
    longitude: z.number(),
  }).optional(),

  workSummary:         z.string().optional(),
  rejectionReason:     z.string().optional(),

  status:              z.nativeEnum(AttendanceStatus),

  totalHours:          z.number().optional(),
  totalPay:            z.number().optional(),     // calculated = totalHours × salaryPerHour

  createdAt:           z.date().default(() => new Date()),
  updatedAt:           z.date().optional(),
});

export type Attendance = z.infer<typeof AttendanceSchema>;