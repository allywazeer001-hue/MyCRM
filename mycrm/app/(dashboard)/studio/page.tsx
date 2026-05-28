"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Database, Edit, Trash2, MoreHorizontal, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useModulesStore } from "@/store/modules.store";
import { formatDate } from "@/lib/utils";

const ICON_BG: Record<string, string> = {
  0: "bg-blue-50 text-blue-600",
  1: "bg-purple-50 text-purple-600",
  2: "bg-green-50 text-green-600",
  3: "bg-orange-50 text-orange-600",
  4: "bg-pink-50 text-pink-600",
  5: "bg-teal-50 text-teal-600",
};

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
      <div className="flex items-center justify-between">
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
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${ICON_BG[i % 6 + ""]}`}>
                    {mod.icon || "📦"}
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
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <h3 className="font-semibold text-gray-900 mb-1">{mod.name}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                  {mod.description || `Manage ${mod.name.toLowerCase()} data`}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-xs">
                      {mod.fields?.length || 0} fields
                    </Badge>
                  </div>
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
