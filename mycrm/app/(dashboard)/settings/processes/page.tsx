"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Blueprint {
  id: string;
  name: string;
  moduleId?: string;
  triggerField?: string;
  triggerValue?: string;
  isActive: boolean;
  _count?: { stages: number; instances: number };
}

export default function ProcessBlueprintsPage() {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { fetchBlueprints(); }, []);

  async function fetchBlueprints() {
    try {
      setLoading(true);
      const res = await api.get("/process/blueprints");
      setBlueprints(res.data ?? []);
    } catch (err: unknown) {
      console.error("Failed to fetch blueprints", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(bp: Blueprint) {
    setTogglingId(bp.id);
    try {
      const res = await api.patch(`/process/blueprints/${bp.id}`, { isActive: !bp.isActive });
      setBlueprints(prev => prev.map(b => b.id === bp.id ? { ...b, isActive: res.data.isActive } : b));
    } catch (err: unknown) {
      console.error("Toggle failed", err);
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete blueprint "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await api.delete(`/process/blueprints/${id}`);
      setBlueprints(prev => prev.filter(b => b.id !== id));
    } catch (err: unknown) {
      console.error("Delete failed", err);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Process Blueprints</h1>
          <p className="text-sm text-gray-500 mt-0.5">Design reusable approval and workflow chains</p>
        </div>
        <Link href="/settings/processes/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Blueprint
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : blueprints.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <Plus className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium">No blueprints yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first process blueprint to get started</p>
          <Link href="/settings/processes/new" className="mt-4">
            <Button variant="outline">Create Blueprint</Button>
          </Link>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Trigger</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Stages</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Instances</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Active</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {blueprints.map(bp => (
                <tr key={bp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{bp.name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {bp.triggerField ? (
                      <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                        {bp.triggerField} = {bp.triggerValue || "*"}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{bp._count?.stages ?? 0}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{bp._count?.instances ?? 0}</td>
                  <td className="px-4 py-3">
                    <Switch
                      checked={bp.isActive}
                      disabled={togglingId === bp.id}
                      onCheckedChange={() => handleToggleActive(bp)}
                    />
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <Link href={`/settings/processes/${bp.id}`}>
                      <Button variant="ghost" size="icon" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Delete"
                      disabled={deletingId === bp.id}
                      onClick={() => handleDelete(bp.id, bp.name)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      {deletingId === bp.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
