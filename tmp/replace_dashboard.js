const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('c:/Users/merilliana/OneDrive/Desktop/Rendezvous/solarworks-pos-serverless/src/app/(dashboard)/(admin)/staff-attendance/page.tsx');
const content = fs.readFileSync(targetFile, 'utf8');

const lines = content.split('\n');
const startIdx = lines.findIndex(l => l.includes('{/* ── Dashboard Tab ──────────────────────────────────────────────────── */}'));
const endIdx = lines.findIndex(l => l.includes('{/* ── Schedule Tab ───────────────────────────────────────────────────── */}'));

if (startIdx === -1 || endIdx === -1) {
  console.error("Could not find boundaries");
  process.exit(1);
}

const newDashboardContent = `
        {/* ── Dashboard/Staff Roster Tab ──────────────────────────────────────── */}
        <TabsContent value="dashboard" className="space-y-6">

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Staff Roster</h2>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDailyData}
                disabled={dailyLoading}
              >
                <RefreshCw className={\`mr-2 h-4 w-4 \${dailyLoading ? "animate-spin" : ""}\`} />
                Refresh
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle>All Staff Members</CardTitle>
              <CardDescription>
                Click on a staff member to view their complete attendance history.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {dailyLoading ? (
                <div className="grid gap-3">
                  {Array(6).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-border bg-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground w-12">Avatar</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Staff Name</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Today's Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {dailyStaff.map(s => {
                          const statusColor =
                            s.status === "present"
                              ? { badge: "bg-green-600 hover:bg-green-600", dot: "bg-green-500" }
                              : s.status === "late"
                              ? { badge: "bg-amber-500 hover:bg-amber-500", dot: "bg-amber-500" }
                              : { badge: "bg-rose-600 hover:bg-rose-600", dot: "bg-gray-300" };

                          return (
                            <tr 
                              key={s.staffId} 
                              className="hover:bg-accent/50 transition-colors cursor-pointer"
                              onClick={() => {
                                setSelectedStaff(s.staffId);
                                setSelectedStaffModal({
                                  id: s.staffId,
                                  name: s.name,
                                  email: "",
                                  role: s.role,
                                  image: null,
                                  hasPin: false,
                                  isClockedIn: s.isCurrentlyIn,
                                  clockInTime: s.clockInTime || null,
                                });
                              }}
                            >
                              <td className="px-4 py-3">
                                <div className="relative inline-block">
                                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                    {s.name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className={\`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background \${statusColor.dot}\`} />
                                </div>
                              </td>
                              <td className="px-4 py-3 font-semibold text-foreground">
                                {s.name}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground capitalize">
                                {s.role}
                              </td>
                              <td className="px-4 py-3">
                                <Badge className={\`text-[10px] px-2 py-0.5 \${statusColor.badge}\`}>
                                  {s.status === "present" ? "Present" : s.status === "late" ? "Late" : "Absent"}
                                </Badge>
                                {s.isCurrentlyIn && (
                                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-blue-400 text-blue-600 ml-2">
                                    On Floor
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Modal for viewing specific staff records */}
          <Dialog open={!!selectedStaffModal} onOpenChange={(open) => {
            if (!open) {
              setSelectedStaffModal(null);
            }
          }}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6 border-0 shadow-2xl overflow-hidden bg-background sm:rounded-2xl">
              <DialogHeader className="shrink-0 mb-4">
                <DialogTitle className="text-xl font-bold flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {selectedStaffModal?.name?.charAt(0).toUpperCase()}
                  </div>
                  {selectedStaffModal?.name}'s Attendance Records
                </DialogTitle>
                <DialogDescription>
                  Detailed log of clock in and clock out times
                </DialogDescription>
              </DialogHeader>

              <div className="flex gap-4 mb-4 shrink-0 flex-col sm:flex-row">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Start Date</label>
                  <Button variant="outline" className="justify-start font-normal bg-muted/30 border-muted-foreground/20 hover:bg-muted" onClick={() => setShowDatePicker((prev) => !prev)}>
                    <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                    {startDate ? startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "Select start date"}
                  </Button>
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">End Date</label>
                  <Button variant="outline" className="justify-start font-normal bg-muted/30 border-muted-foreground/20 hover:bg-muted" onClick={() => setShowDatePicker((prev) => !prev)}>
                    <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                    {endDate ? endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "Select end date"}
                  </Button>
                </div>
                <div className="flex flex-col justify-end">
                   <Button variant="outline" onClick={() => {
                        const filename = selectedStaffModal?.name?.replace(/\\s+/g, "-") + "-attendance.csv";
                        const csvHeaders = ["Staff Name","Email","Date","Clock In","Clock Out","Hours Worked","Status"];
                        const rows = records.map((r) => [
                          r.user?.name || "Unknown",
                          r.user?.email || "",
                          formatDate(r.date),
                          formatTime(r.clockInTime),
                          r.clockOutTime ? formatTime(r.clockOutTime) : "Not clocked out",
                          r.hoursWorked ? r.hoursWorked.toFixed(2) : "—",
                          r.status,
                        ]);
                        exportToCSV([csvHeaders, ...rows], filename);
                        toast.success("Attendance exported as CSV");
                   }} disabled={dashboardLoading || records.length === 0}>
                     <Download className="mr-2 h-4 w-4" /> Export CSV
                   </Button>
                </div>
              </div>

              <div className="flex-1 overflow-auto min-h-0 min-w-0 rounded-xl border border-border/50 bg-card">
                {records.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                    <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground/40" />
                    <h3 className="text-lg font-semibold">No records found</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">No attendance records were found for this staff member in the selected date range.</p>
                  </div>
                ) : (
                  <DataTable
                    columns={dashboardColumns}
                    data={records}
                    enablePagination
                    enableSorting
                    emptyMessage="No records match the current filters"
                    loading={dashboardLoading}
                    loadingMessage="Loading attendance records..."
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
`;

const newContent = [
  ...lines.slice(0, startIdx),
  newDashboardContent,
  ...lines.slice(endIdx)
].join('\n');

fs.writeFileSync(targetFile, newContent);
console.log('Successfully updated the dashboard tab layout.');
