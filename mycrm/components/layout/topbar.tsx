"use client";
import { useState, useEffect } from "react";
import { Bell, Search, ChevronDown, LogOut, User, Settings, Shield, Menu, X } from "lucide-react";
import { AppSwitcher } from "@/components/app-switcher";
import { useAuthStore } from "@/store/auth.store";
import { useNotificationsStore } from "@/store/notifications.store";
import { usePermissionsStore } from "@/store/permissions.store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { toTitleCase } from "@/lib/utils";

export function Topbar({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const { user, logout } = useAuthStore();
  const { unreadCount, fetchUnreadCount, connectSocket, disconnectSocket } = useNotificationsStore();
  const { loadPermissions, reset: resetPermissions } = usePermissionsStore();
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isAdmin = isSuperAdmin || user?.role === "ADMIN";
  const org = (user as any)?.organization;
  const orgName = org?.name ? toTitleCase(org.name) : null;

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (!user) { resetPermissions(); return; }
    connectSocket(user.id, user.organizationId);
    loadPermissions();
    return () => disconnectSocket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : "U";

  return (
    <header className="h-13 bg-background border-b border-border flex items-center shrink-0 relative" style={{ height: 52 }}>

      {/* ── LEFT: hamburger + org branding ────────────────────── */}
      <div className="flex items-center gap-2 pl-3 sm:pl-4 flex-1 min-w-0">

        {/* Mobile hamburger */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors shrink-0"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Org branding */}
        {orgName && (
          <div className="flex items-center gap-2 min-w-0">
            {org?.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={org.logo}
                alt={orgName}
                className="w-7 h-7 rounded-lg object-contain bg-white border border-gray-200 shadow-sm shrink-0"
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white text-xs font-bold shadow-sm"
                style={{ background: "linear-gradient(135deg,#374151,#1f2937)" }}
              >
                {orgName[0]}
              </div>
            )}
            <span className="text-sm font-bold text-foreground tracking-tight truncate hidden sm:block max-w-[180px]">
              {orgName}
            </span>
          </div>
        )}
      </div>

      {/* ── CENTER: search (absolutely centered) ───────────────── */}
      <div className="absolute left-1/2 -translate-x-1/2 hidden sm:flex items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search records, modules…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-8 pl-9 pr-3 text-sm bg-secondary border border-border rounded-lg w-56 focus:w-72 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring focus:bg-background transition-all duration-200"
          />
        </div>
      </div>

      {/* Mobile search toggle */}
      {searchOpen && (
        <div className="sm:hidden absolute top-full left-0 right-0 bg-background border-b border-border px-3 py-2 z-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              autoFocus
              type="text"
              placeholder="Search records, modules…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background"
            />
          </div>
        </div>
      )}

      {/* ── RIGHT: actions ─────────────────────────────────────── */}
      <div className="flex items-center gap-1 pr-3 sm:pr-4 flex-1 justify-end">

        {/* Mobile search icon */}
        <button
          onClick={() => setSearchOpen(s => !s)}
          className="sm:hidden p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors"
          aria-label="Search"
        >
          {searchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
        </button>

        <AppSwitcher />

        {/* Notifications */}
        <Link href="/notifications">
          <button className="relative p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </Link>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-accent transition-colors">
              <Avatar className="w-7 h-7">
                {user?.avatar && <AvatarImage src={user.avatar} alt={initials} className="object-cover" />}
                <AvatarFallback className={`text-xs font-semibold ${isSuperAdmin ? "bg-brand/15 text-brand" : "bg-secondary text-secondary-foreground"}`}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    {user?.firstName} {user?.lastName}
                  </p>
                  {isSuperAdmin && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand/15 text-brand leading-none">
                      <Shield className="w-2.5 h-2.5" />SA
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-tight capitalize">{user?.role?.toLowerCase()}</p>
              </div>
              <ChevronDown className="w-3 h-3 text-muted-foreground hidden md:block" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold">{user?.firstName} {user?.lastName}</p>
                  {isSuperAdmin && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand/15 text-brand leading-none">
                      <Shield className="w-2.5 h-2.5" />Super Admin
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-normal">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href="/profile">
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />My Profile
              </DropdownMenuItem>
            </Link>
            <Link href="/settings">
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />Settings
              </DropdownMenuItem>
            </Link>
            {isAdmin && (
              <Link href="/admin">
                <DropdownMenuItem className="cursor-pointer">
                  <Shield className="mr-2 h-4 w-4" />Admin Panel
                </DropdownMenuItem>
              </Link>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
              <LogOut className="mr-2 h-4 w-4" />Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

    </header>
  );
}
