"use client"

import { useState, useEffect } from "react"
import { IconChevronDown } from "@tabler/icons-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ComponentType } from "react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

type NavIcon = ComponentType<{ className?: string; size?: number; stroke?: number }>

interface NavItem {
  title: string
  url: string
  icon?: NavIcon
  defaultExpanded?: boolean
  subItems?: { title: string; url: string; icon?: NavIcon }[]
}

function NavItemWithSub({ item, pathname }: { item: NavItem; pathname: string }) {
  const isParentActive =
    pathname === item.url ||
    pathname.startsWith(item.url + "/") ||
    (item.url === "/agents" && pathname.startsWith("/agents"))
  const [open, setOpen] = useState(item.defaultExpanded ?? isParentActive)

  useEffect(() => {
    if (isParentActive) setOpen(true)
  }, [isParentActive])

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={item.title}
        isActive={isParentActive}
        onClick={() => setOpen((o) => !o)}
        className="cursor-pointer"
      >
        {item.icon && <item.icon />}
        <span className="flex-1">{item.title}</span>
        <IconChevronDown
          className={cn("w-3.5 h-3.5 text-sidebar-foreground/40 transition-transform duration-200", open ? "rotate-0" : "-rotate-90")}
        />
      </SidebarMenuButton>
      {open && (
        <SidebarMenuSub>
          {item.subItems!.map((sub) => {
            const isSubActive = pathname === sub.url
            return (
              <SidebarMenuSubItem key={sub.title}>
                <SidebarMenuSubButton asChild isActive={isSubActive} className="h-auto py-1.5 whitespace-normal [&>span:last-child]:overflow-visible [&>span:last-child]:whitespace-normal [&>span:last-child]:truncate-none">
                  <Link href={sub.url}>
                    {sub.icon && <sub.icon className="w-3.5 h-3.5 flex-shrink-0" />}
                    <span className="leading-snug">{sub.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            )
          })}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  )
}

export function NavMain({ items }: { items: NavItem[] }) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) =>
            item.subItems ? (
              <NavItemWithSub key={item.title} item={item} pathname={pathname} />
            ) : (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={pathname === item.url || (item.url !== "/" && pathname.startsWith(item.url))}
                >
                  <Link href={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
