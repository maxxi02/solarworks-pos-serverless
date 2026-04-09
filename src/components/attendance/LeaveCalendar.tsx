"use client";

import React, { useState } from "react";
import { CheckCircle, XCircle, Calendar as CalendarIcon, Info, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export interface LeaveRequest {
  _id: string;
  userId?: string;
  userName?: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  reviewNote?: string;
}

interface LeaveCalendarProps {
  requests: LeaveRequest[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  isAdmin?: boolean;
}

export function LeaveCalendar({ requests, onApprove, onReject, isAdmin = false }: LeaveCalendarProps) {
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay()); // start of this week (Sunday)
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedReq, setSelectedReq] = useState<LeaveRequest | null>(null);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(new Date(d));
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(new Date(d));
  };

  const isDayInInterval = (day: Date, startStr: string, endStr: string) => {
    const s = new Date(startStr + "T00:00:00");
    const e = new Date(endStr + "T00:00:00");
    const dTime = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
    return dTime >= s.getTime() && dTime <= e.getTime();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-green-600 hover:bg-green-600 shadow-sm text-[10px] px-1.5 py-0 gap-1"><CheckCircle className="h-2.5 w-2.5"/> Approved</Badge>;
      case "rejected": return <Badge variant="destructive" className="shadow-sm text-[10px] px-1.5 py-0 gap-1"><XCircle className="h-2.5 w-2.5"/> Rejected</Badge>;
      default: return <Badge className="bg-yellow-500 hover:bg-yellow-500 text-black shadow-sm text-[10px] px-1.5 py-0">Pending</Badge>;
    }
  };

  const hasAnyRequestsThisWeek = Array.from({ length: 7 }).some((_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    return requests.some(req => isDayInInterval(date, req.startDate, req.endDate));
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={prevWeek}>← Prev</Button>
          <span className="text-sm font-medium">
            {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            {" – "}
            {weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
          <Button variant="outline" size="sm" onClick={nextWeek}>Next →</Button>
        </div>
      </div>

      {!hasAnyRequestsThisWeek && requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-card rounded-xl border border-dashed text-muted-foreground">
          <CalendarDays className="h-8 w-8 mb-3 opacity-60" />
          <h3 className="font-medium text-foreground">No leave requests</h3>
          <p className="text-sm mt-1">There are no leave requests to display</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => {
            const date = new Date(weekStart);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split("T")[0];
            const isToday = new Date().toISOString().split("T")[0] === dateStr;
            const dayRequests = requests.filter(req => isDayInInterval(date, req.startDate, req.endDate));

            return (
              <div key={dateStr} className={`flex flex-col rounded-xl border bg-card overflow-hidden shadow-sm ${isToday ? 'ring-2 ring-primary/50 border-transparent' : 'border-border'}`}>
                <div className={`py-2 text-center border-b ${isToday ? 'bg-primary text-primary-foreground' : 'bg-muted/50'}`}>
                  <div className="text-xs font-semibold uppercase tracking-wider opacity-80">{date.toLocaleDateString("en-US", { weekday: "short" })}</div>
                  <div className="text-xl font-bold leading-tight">{date.getDate()}</div>
                </div>
                <div className="flex-1 p-2 space-y-2 min-h-[140px]">
                  {dayRequests.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                      <span className="text-xs text-muted-foreground/60 italic">No leaves</span>
                    </div>
                  ) : (
                    dayRequests.map((req) => {
                      const isMulti = req.startDate !== req.endDate;
                      let spanText = "";
                      if (isMulti) {
                        spanText = `(Day ${Math.floor((date.getTime() - new Date(req.startDate + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24)) + 1})`;
                      }

                      return (
                        <div 
                          key={`${req._id}-${i}`} 
                          onClick={() => setSelectedReq(req)}
                          className={`relative group cursor-pointer text-left text-xs bg-background rounded-md border p-2 shadow-sm transition-colors hover:border-primary/50
                            ${req.status === 'pending' ? 'border-yellow-500/30 bg-yellow-500/5' : req.status === 'approved' ? 'border-green-500/30 bg-green-500/5' : ''}
                          `}
                        >
                          <div className="font-semibold text-foreground pr-1 truncate">{req.userName || "Leave"}</div>
                          
                          <div className="flex items-center gap-1 mt-1">
                            {getStatusBadge(req.status)}
                          </div>
                          
                          {(req.reason || spanText) && (
                            <div className="text-muted-foreground text-[10px] mt-1.5 line-clamp-2" title={req.reason}>
                              {spanText && <span className="font-semibold text-primary/70 mr-1">{spanText}</span>}
                              {req.reason}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Request Modal */}
      <Dialog open={!!selectedReq} onOpenChange={(open) => !open && setSelectedReq(null)}>
        <DialogContent className="max-w-md sm:rounded-2xl border-0 shadow-2xl overflow-hidden bg-background p-0">
          <div className="bg-muted/30 p-6 pb-5 border-b flex items-start justify-between">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-xl flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                Leave Request Details
              </DialogTitle>
              <DialogDescription>
                Submitted by {selectedReq?.userName || "Staff Member"}
              </DialogDescription>
            </DialogHeader>
          </div>
          
          {selectedReq && (
            <div className="p-6 space-y-5">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="bg-card border rounded-lg px-3 py-2 flex items-center gap-2 shadow-sm">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">
                    {selectedReq.startDate === selectedReq.endDate 
                      ? selectedReq.startDate 
                      : `${selectedReq.startDate} to ${selectedReq.endDate}`}
                  </span>
                </div>
                <div>{getStatusBadge(selectedReq.status)}</div>
              </div>

              <div className="space-y-1.5 rounded-xl bg-card border px-4 py-3 shadow-sm">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Reason
                </label>
                <p className="text-sm leading-relaxed">{selectedReq.reason}</p>
              </div>

              {selectedReq.reviewNote && (
                <div className={`space-y-1.5 rounded-xl border px-4 py-3 shadow-sm ${
                   selectedReq.status === "rejected" ? "bg-rose-500/10 border-rose-500/20" : 
                   selectedReq.status === "approved" ? "bg-green-500/10 border-green-500/20" : 
                   "bg-muted/50"
                }`}>
                  <label className="text-xs font-semibold uppercase tracking-wider opacity-70">
                    Review Note
                  </label>
                  <p className="text-sm font-medium italic">
                    "{selectedReq.reviewNote}"
                  </p>
                </div>
              )}

              {isAdmin && selectedReq.status === "pending" && (
                <div className="flex gap-3 pt-4 border-t border-border mt-6">
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700 shadow-sm transition-transform active:scale-95" 
                    onClick={() => {
                      onApprove?.(selectedReq._id);
                      setSelectedReq(null);
                    }}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" /> Approve
                  </Button>
                  <Button 
                    className="flex-1 transition-transform active:scale-95"
                    variant="destructive" 
                    onClick={() => {
                      onReject?.(selectedReq._id);
                      setSelectedReq(null);
                    }}
                  >
                    <XCircle className="mr-2 h-4 w-4" /> Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
