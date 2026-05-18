"use client"

import * as React from "react"
import {
  IconDashboard,
  IconTerminal2,
  IconFolderOpen,
  IconSettings,
} from "@tabler/icons-react"

import { NavMain } from "@/components/ui/nav-main"
import { NavSecondary } from "@/components/ui/nav-secondary"
import { NavUser } from "@/components/ui/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import Logo from "../logo/Logo"
import Link from "next/link"

const data = {
  user: {
    name: "TPM Agent",
    email: "tpm@lyzr.ai",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    { title: "Dashboard", url: "/", icon: IconDashboard },
    { title: "Workspace", url: "/workspace", icon: IconTerminal2 },
    { title: "Session Viewer", url: "/session", icon: IconFolderOpen },
  ],
  navSecondary: [
    { title: "Settings", url: "#", icon: IconSettings },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
              <Link href="/">
                <Logo />
                <span className="text-base font-semibold">TPM Agent</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
