"use client";

import type React from "react";

export const Sidebar = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <aside className={`bg-[#FFFFFF] text-white w-64 ${className}`}>
    {children}
  </aside>
);

export const SidebarHeader = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={`p-4 ${className}`}>{children}</div>;

export const SidebarContent = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={`p-4 ${className}`}>{children}</div>;

export const SidebarMenu = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => <nav className={`flex flex-col ${className}`}>{children}</nav>;

export const SidebarMenuItem = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={`${className}`}>{children}</div>;

export const SidebarMenuButton = ({
  asChild,
  children,
  className = "",
}: {
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={className}>
    {asChild ? children : <div className="w-full">{children}</div>}
  </div>
);
