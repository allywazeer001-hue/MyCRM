"use client";
import { useEffect, useState } from "react";
import { BarChart3, Users, Database, Workflow, TrendingUp, ArrowUpRight, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth.store";
import { useModulesStore } from "@/store/modules.store";
import { api } from "@/lib/api";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

const COLORS = ["bg-blue-500", "bg-purple-500", "bg-green-500", "bg-orange-500", "bg-pink-500", "bg-teal-500"];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { modules } = useModulesStore();
  const [stats, setStats] = useState({ totalRecords: 0, activeWorkflows: 0, users: 0 });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [auditRes] = await Promise.all([
          api.get("/audit?limit=8"),
        ]);
        setRecentActivity(auditRes.data || []);
      } catch {}
    };
    fetchStats();
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting()}, {user?.firstName} 👋
          </h1>
          <p className="text-gray-500 mt-1">
            Here&apos;s what&apos;s happening in your workspace today.
          </p>
        </div>
        <Link href="/studio/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Module
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Modules</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{modules.length}</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-2">
                  <TrendingUp className="w-3 h-3" /> Active modules
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Records</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">—</p>
                <p className="text-xs text-gray-400 mt-2">Across all modules</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Workflows</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">—</p>
                <p className="text-xs text-gray-400 mt-2">Automations running</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <Workflow className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Team Members</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">—</p>
                <p className="text-xs text-gray-400 mt-2">Active users</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Modules Grid */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">Your Modules</CardTitle>
              <Link href="/studio">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Plus className="w-3 h-3" />
                  Add Module
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {modules.length === 0 ? (
                <div className="text-center py-12">
                  <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No modules yet</h3>
                  <p className="text-sm text-gray-500 mb-4">Create your first module to start managing your data.</p>
                  <Link href="/studio/new">
                    <Button size="sm" className="gap-2">
                      <Plus className="w-4 h-4" />
                      Create Module
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {modules.map((mod, i) => (
                    <Link key={mod.id} href={`/m/${mod.slug}`}>
                      <div className="group flex flex-col items-center p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all cursor-pointer">
                        <div className={`w-10 h-10 rounded-xl ${COLORS[i % COLORS.length]} bg-opacity-10 flex items-center justify-center mb-2.5 text-xl`}>
                          {mod.icon || "📦"}
                        </div>
                        <span className="text-sm font-medium text-gray-900 text-center truncate w-full">{mod.name}</span>
                        <span className="text-xs text-gray-400 mt-0.5">{mod.fields?.length || 0} fields</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.slice(0, 6).map((log: any) => (
                    <div key={log.id} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs">
                          {log.user?.firstName?.[0]}{log.user?.lastName?.[0]}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700">
                          <span className="font-medium">{log.user?.firstName}</span>{" "}
                          {log.action.replace(/_/g, " ").toLowerCase()}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(log.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
