// lib/utils/export-attendance.ts

import type { AttendanceWithUser } from "@/types/attendance";

/**
 * Export attendance data to CSV format
 */
export function exportToCSV(
  data: AttendanceWithUser[] | string[][], 
  filename: string
): void {
  let csvContent: string;

  if (Array.isArray(data[0]) && typeof data[0][0] === 'string') {
    // Handle string[][] format
    csvContent = (data as string[][])
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  } else {
    // Handle AttendanceWithUser[] format (existing logic)
    const records = data as AttendanceWithUser[];
    const headers = ["Staff Name", "Email", "Date", "Clock In", "Clock Out", "Hours Worked", "Status"];
    const rows = records.map(r => [
      r.user?.name || "Unknown",
      r.user?.email || "",
      new Date(r.date).toLocaleDateString(),
      new Date(r.clockInTime).toLocaleTimeString(),
      r.clockOutTime ? new Date(r.clockOutTime).toLocaleTimeString() : "Not clocked out",
      r.hoursWorked ? r.hoursWorked.toFixed(2) : "—",
      r.status
    ]);
    
    csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  // Download logic
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
/**
 * Export attendance data to Excel format (using CSV with .xlsx extension)
 * For true Excel format, you'd need a library like xlsx or exceljs
 */
export const exportToExcel = (
  records: AttendanceWithUser[],
  filename: string = "attendance-report",
) => {
  // For now, use CSV format with .xlsx extension
  // In production, consider using SheetJS (xlsx) library for true Excel format
  exportToCSV(records, filename);
};

/**
 * Export attendance data to plain text format
 */
export const exportToTXT = (
  records: AttendanceWithUser[],
  filename: string = "attendance-report",
) => {
  let content = "ATTENDANCE REPORT\n";
  content += "=".repeat(80) + "\n\n";
  content += `Generated: ${new Date().toLocaleString()}\n`;
  content += `Total Records: ${records.length}\n\n`;
  content += "=".repeat(80) + "\n\n";

  records.forEach((record, index) => {
    content += `Record ${index + 1}\n`;
    content += "-".repeat(80) + "\n";
    content += `Staff: ${record.user?.name || "Unknown"} (${record.user?.email || "N/A"})\n`;
    content += `Role: ${record.user?.role || "N/A"}\n`;
    content += `Date: ${record.date}\n`;
    content += `Clock In: ${new Date(record.clockInTime).toLocaleString()}\n`;
    content += `Clock Out: ${record.clockOutTime ? new Date(record.clockOutTime).toLocaleString() : "Not clocked out"}\n`;
    content += `Hours Worked: ${record.hoursWorked?.toFixed(2) || "0"} hours\n`;
    content += `Status: ${record.status.toUpperCase()}\n`;
    if (record.adminNote) {
      content += `Admin Note: ${record.adminNote}\n`;
    }
    content += "\n";
  });

  downloadFile(content, `${filename}.txt`, "text/plain");
};

/**
 * Export attendance data to JSON format
 */
export const exportToJSON = (
  records: AttendanceWithUser[],
  filename: string = "attendance-report",
) => {
  const data = {
    exportDate: new Date().toISOString(),
    totalRecords: records.length,
    records: records.map((record) => ({
      staffName: record.user?.name || "Unknown",
      email: record.user?.email || "",
      role: record.user?.role || "",
      date: record.date,
      clockIn: record.clockInTime,
      clockOut: record.clockOutTime || null,
      hoursWorked: record.hoursWorked || 0,
      status: record.status,
      adminNote: record.adminNote || "",
    })),
  };

  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, `${filename}.json`, "application/json");
};

/**
 * Helper function to trigger file download
 */
const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Generate filename with date range
 */
export const generateFilename = (
  startDate?: string,
  endDate?: string,
  staffName?: string,
) => {
  const prefix = "attendance-report";
  const parts = [prefix];

  if (staffName) {
    parts.push(staffName.replace(/\s+/g, "-").toLowerCase());
  }

  if (startDate && endDate) {
    parts.push(`${startDate}_to_${endDate}`);
  } else if (startDate) {
    parts.push(`from_${startDate}`);
  } else {
    parts.push(new Date().toISOString().split("T")[0]);
  }

  return parts.join("_");
};
