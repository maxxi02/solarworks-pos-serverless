"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/card";
import { TrendingUp, Users, Activity, ArrowUpRight } from "lucide-react";

const DashboardContent = () => {
  const data = [
    { month: "Jan", revenue: 4000, users: 2400, engagement: 2400 },
    { month: "Feb", revenue: 3000, users: 1398, engagement: 2210 },
    { month: "Mar", revenue: 2000, users: 9800, engagement: 2290 },
    { month: "Apr", revenue: 2780, users: 3908, engagement: 2000 },
    { month: "May", revenue: 1890, users: 4800, engagement: 2181 },
    { month: "Jun", revenue: 2390, users: 3800, engagement: 2500 },
    { month: "Jul", revenue: 3490, users: 4300, engagement: 2100 },
  ];

  const statCards = [
    { title: "Total Revenue", value: "$24,582", change: "+12.5%", icon: TrendingUp },
    { title: "Active Users", value: "8,264", change: "+8.2%", icon: Users },
    { title: "Engagement Rate", value: "64.2%", change: "+2.3%", icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
          <p className="text-muted-foreground">Welcome back&apos Here s whats happening today.</p>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <Card key={idx} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-green-600">{stat.change}</p>
                  </div>
                  <Icon className="h-8 w-8 text-muted-foreground" />
                </div>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h3 className="mb-4 text-lg font-semibold">Revenue Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="revenue" stroke="#8884d8" fill="#8884d8" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">User Growth</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="users" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <div className="mt-8">
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Performance Metrics</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#8884d8" dot={false} />
                <Line type="monotone" dataKey="users" stroke="#82ca9d" dot={false} />
                <Line type="monotone" dataKey="engagement" stroke="#ffc658" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default DashboardContent;