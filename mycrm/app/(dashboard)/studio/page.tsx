"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Database, Edit, Trash2, MoreHorizontal, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useModulesStore } from "@/store/modules.store";
import { ModuleIcon } from "@/components/ui/module-icon";

export default function StudioPage() {
  const { modules, fetchModules, deleteModule, isLoading } = useModulesStore();
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => { fetchModules(); }, [fetchModules]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this module? Records will be preserved.")) return;
    setDeleting(id);
    try { await deleteModule(id); } finally { setDeleting(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Module Studio</h1>
          <p className="text-gray-500 mt-1">Build and manage your custom data modules.</p>
        </div>
        <Link href="/studio/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Module
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-10 w-10 rounded-xl bg-gray-100 mb-4" />
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : modules.length === 0 ? (
        <div className="text-center py-20">
          <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No modules yet</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Create your first module to start managing custom data. Build anything from CRM contacts to inventory items.
          </p>
          <Link href="/studio/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Your First Module
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod, i) => (
            <Card key={mod.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: mod.color ? `${mod.color}18` : ["#eff6ff","#f5f3ff","#f0fdf4","#fff7ed","#fdf4ff","#ecfeff"][i % 6],
                      color: mod.color ?? ["#3b82f6","#8b5cf6","#22c55e","#f97316","#a855f7","#06b6d4"][i % 6],
                    }}
                  >
                    <ModuleIcon icon={mod.icon} slug={mod.slug} size={22} />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <Link href={`/studio/${mod.id}`}>
                        <DropdownMenuItem className="cursor-pointer">
                          <Edit className="mr-2 h-4 w-4" /> Edit Module
                        </DropdownMenuItem>
                      </Link>
                      <Link href={`/m/${mod.slug}`}>
                        <DropdownMenuItem className="cursor-pointer">
                          <Layers className="mr-2 h-4 w-4" /> View Records
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuItem
                        className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                        onClick={() => handleDelete(mod.id)}
                        disabled={deleting === mod.id}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {deleting === mod.id ? "Deleting…" : "Delete"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <h3 className="font-semibold text-gray-900 mb-1">{mod.name}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                  {mod.description || `Manage ${mod.name.toLowerCase()} data`}
                </p>

                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    {mod.fields?.length ?? 0} fields
                  </Badge>
                  <Link href={`/studio/${mod.id}`}>
                    <Button variant="outline" size="sm" className="text-xs gap-1.5">
                      <Edit className="w-3 h-3" /> Edit
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
