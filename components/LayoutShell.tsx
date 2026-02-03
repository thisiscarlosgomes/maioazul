"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";

const navRoutes = ["/map", "/places", "/favorites"];

function shouldShowNav(pathname: string | null) {
  if (!pathname) return false;
  return navRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export default function LayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showNav = shouldShowNav(pathname);

  return (
    <>
      <div
        className={showNav ? "min-h-[100svh] pb-24" : "min-h-[100svh]"}
        style={
          showNav
            ? { paddingBottom: "calc(6rem + env(safe-area-inset-bottom))" }
            : undefined
        }
      >
        {children}
      </div>
      {showNav && <BottomNav />}
    </>
  );
}
