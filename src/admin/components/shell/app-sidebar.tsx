"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { ExternalLink, LogOut } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { api, logout } from "@/lib/session";
import { isActive, NAV_GROUPS, type NavItem, SETTINGS_ITEM } from "@/navigation";

function NavLink({ item, pathname, badge }: { item: NavItem; pathname: string; badge?: number }) {
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive(item, pathname)}
        tooltip={item.title}
        className="h-10 text-[0.95rem] data-[active=true]:bg-sidebar-primary data-[active=true]:font-semibold data-[active=true]:text-sidebar-primary-foreground"
      >
        <Link href={item.url} onClick={() => setOpenMobile(false)}>
          <item.icon />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
      {!!badge && <SidebarMenuBadge className="rounded-full bg-sidebar-primary px-1.5 text-sidebar-primary-foreground">{badge}</SidebarMenuBadge>}
    </SidebarMenuItem>
  );
}

export function AppSidebar({ email }: { email: string }) {
  const pathname = usePathname() || "/admin";
  // Unread contact messages, shown on "Clients"; refreshed every minute.
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    const load = () => api<{ data: number }>("/api/admin/messages?count=unread").then((r) => setUnread(r.data)).catch(() => {});
    load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), 60000);
    return () => clearInterval(t);
  }, [pathname]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 pt-5 pb-4">
        <Link href="/admin" className="flex items-center gap-2.5 overflow-hidden">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary font-heading text-sm font-extrabold text-sidebar-primary-foreground">
            OA
          </span>
          <span className="grid leading-tight group-data-[collapsible=icon]:hidden">
            <span className="font-heading text-[0.95rem] font-bold tracking-wide text-white">Événementiel</span>
            <span className="text-[0.7rem] uppercase tracking-[0.18em] text-sidebar-foreground/60">Espace de gestion</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[0.68rem] uppercase tracking-[0.18em] text-sidebar-foreground/50">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.items.map((item) => (
                  <NavLink key={item.url} item={item} pathname={pathname} badge={item.url === "/admin/clients" ? unread : 0} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="pb-4">
        <SidebarMenu className="gap-1">
          <NavLink item={SETTINGS_ITEM} pathname={pathname} />
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Voir le site" className="h-10">
              <a href="/" target="_blank" rel="noreferrer">
                <ExternalLink />
                <span>Voir le site</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Se déconnecter" className="h-auto py-2" onClick={logout}>
              <LogOut />
              <span className="grid min-w-0 text-left leading-tight">
                <span className="text-sm">Se déconnecter</span>
                <span className="truncate text-xs text-sidebar-foreground/55">{email}</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
