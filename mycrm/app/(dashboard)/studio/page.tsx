"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Database, Edit, Trash2, MoreHorizontal, Layers, Zap, Settings2, X, FolderPlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useModulesStore, DynamicModule } from "@/store/modules.store";
import { useAuthStore } from "@/store/auth.store";
import { ModuleIcon } from "@/components/ui/module-icon";
import { api } from "@/lib/api";
import { generateId } from "@/lib/utils";

interface ModuleGroup { id: string; name: string; order: number }

export default function StudioPage() {
  const { modules, fetchModules, deleteModule, updateModule, isLoading } = useModulesStore();
  const { user, setUser } = useAuthStore();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [managingGroups, setManagingGroups] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  useEffect(() => { fetchModules(); }, [fetchModules]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this module? Records will be preserved.")) return;
    setDeleting(id);
    try { await deleteModule(id); } finally { setDeleting(null); }
  };

  // ── Module Groups — collapsible sidebar sections for modules, e.g.
  // "Education" / "Water" / "Health" instead of one flat "Modules" list.
  // Stored in Organization.settings (no schema change) since it's purely an
  // org-wide display grouping, not a relational entity of its own.
  const moduleGroups: ModuleGroup[] = ((user?.organization?.settings as any)?.moduleGroups ?? []) as ModuleGroup[];

  const persistGroups = async (nextGroups: ModuleGroup[]) => {
    const { data: org } = await api.get("/organizations/me");
    const mergedSettings = { ...(org?.settings ?? {}), moduleGroups: nextGroups };
    await api.patch("/organizations/me", { settings: mergedSettings });
    if (user) setUser({ ...user, organization: { ...(user.organization as any), settings: mergedSettings } });
  };

  const addGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    persistGroups([...moduleGroups, { id: generateId(), name, order: moduleGroups.length }]);
    setNewGroupName("");
  };

  const renameGroup = (groupId: string, name: string) => {
    if (!name.trim()) return;
    persistGroups(moduleGroups.map(g => g.id === groupId ? { ...g, name: name.trim() } : g));
  };

  const removeGroup = (groupId: string) => {
    if (!confirm('Delete this group? Its modules become ungrouped — they are not deleted.')) return;
    persistGroups(moduleGroups.filter(g => g.id !== groupId));
  };

  const setModuleGroup = (mod: DynamicModule, groupId: string | null) => {
    updateModule(mod.id, { settings: { ...(mod.settings ?? {}), groupId: groupId ?? undefined } });
  };

  const groupedModules = moduleGroups.length > 0
    ? (() => {
        const byGroup: Record<string, DynamicModule[]> = {};
        const ungrouped: DynamicModule[] = [];
        for (const mod of modules) {
          const gid = (mod.settings as any)?.groupId;
          if (gid && moduleGroups.some(g => g.id === gid)) (byGroup[gid] ??= []).push(mod);
          else ungrouped.push(mod);
        }
        return { byGroup, ungrouped };
      })()
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Module Studio</h1>
          <p className="text-gray-500 mt-1">Build and manage your custom data modules.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setManagingGroups(v => !v)}>
            <Settings2 className="w-4 h-4" />
            Manage Groups
          </Button>
          <Link href="/studio/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Module
            </Button>
          </Link>
        </div>
      </div>

      {managingGroups && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Module Groups</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Group modules into labeled sections in the sidebar — e.g. "Education", "Water", "Health".
                Modules left ungrouped still show under "Modules" as usual.
              </p>
            </div>
            {moduleGroups.length > 0 && (
              <div className="space-y-2">
                {moduleGroups.map(g => (
                  <div key={g.id} className="flex items-center gap-2">
                    <Input
                      defaultValue={g.name}
                      onBlur={e => renameGroup(g.id, e.target.value)}
                      className="h-8 text-sm max-w-xs"
                    />
                    <span className="text-xs text-gray-400">
                      {modules.filter(m => (m.settings as any)?.groupId === g.id).length} module(s)
                    </span>
                    <button onClick={() => removeGroup(g.id)} className="ml-auto text-gray-300 hover:text-red-500 transition-colors" title="Delete group">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 pt-1">
              <Input
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addGroup(); }}
                placeholder="New group name…"
                className="h-8 text-sm max-w-xs"
              />
              <Button size="sm" variant="outline" className="gap-1.5" onClick={addGroup} disabled={!newGroupName.trim()}>
                <FolderPlus className="w-3.5 h-3.5" /> Add Group
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
      ) : groupedModules ? (
        <div className="space-y-8">
          {moduleGroups.map(g => (
            groupedModules.byGroup[g.id]?.length ? (
              <div key={g.id}>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{g.name}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedModules.byGroup[g.id].map((mod, i) => (
                    <ModuleCard key={mod.id} mod={mod} i={i} moduleGroups={moduleGroups}
                      onSetGroup={setModuleGroup} onDelete={handleDelete} deleting={deleting} />
                  ))}
                </div>
              </div>
            ) : null
          ))}
          {groupedModules.ungrouped.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Modules</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedModules.ungrouped.map((mod, i) => (
                  <ModuleCard key={mod.id} mod={mod} i={i} moduleGroups={moduleGroups}
                    onSetGroup={setModuleGroup} onDelete={handleDelete} deleting={deleting} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod, i) => (
            <ModuleCard key={mod.id} mod={mod} i={i} moduleGroups={moduleGroups}
              onSetGroup={setModuleGroup} onDelete={handleDelete} deleting={deleting} />
          ))}
        </div>
      )}
    </div>
  );
}

function ModuleCard({ mod, i, moduleGroups, onSetGroup, onDelete, deleting }: {
  mod: DynamicModule;
  i: number;
  moduleGroups: ModuleGroup[];
  onSetGroup: (mod: DynamicModule, groupId: string | null) => void;
  onDelete: (id: string) => void;
  deleting: string | null;
}) {
  const currentGroupId = (mod.settings as any)?.groupId;

  return (
    <Card className="group hover:shadow-md transition-shadow">
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
              <Link href={`/settings/field-rules/${mod.id}`}>
                <DropdownMenuItem className="cursor-pointer">
                  <Zap className="mr-2 h-4 w-4" /> Field Rules
                </DropdownMenuItem>
              </Link>
              {moduleGroups.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  {moduleGroups.map(g => (
                    <DropdownMenuItem
                      key={g.id}
                      className="cursor-pointer"
                      disabled={currentGroupId === g.id}
                      onClick={() => onSetGroup(mod, g.id)}
                    >
                      <FolderPlus className="mr-2 h-4 w-4" /> Move to {g.name}
                    </DropdownMenuItem>
                  ))}
                  {currentGroupId && (
                    <DropdownMenuItem className="cursor-pointer" onClick={() => onSetGroup(mod, null)}>
                      <X className="mr-2 h-4 w-4" /> Remove from group
                    </DropdownMenuItem>
                  )}
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                onClick={() => onDelete(mod.id)}
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
  );
}
