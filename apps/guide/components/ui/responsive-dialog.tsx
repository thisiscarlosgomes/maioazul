"use client";

import { ReactNode, useEffect, useState } from "react";
import { Drawer } from "vaul";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type ResponsiveDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  mobileContentClassName?: string;
  desktopContentClassName?: string;
};

function useIsDesktop(minWidth = 1024) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(min-width: ${minWidth}px)`);
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [minWidth]);

  return isDesktop;
}

export default function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  mobileContentClassName,
  desktopContentClassName,
}: ResponsiveDialogProps) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={desktopContentClassName ?? "max-h-[85vh] overflow-y-auto p-5 pt-6"}
        >
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription className="mt-1">{description}</DialogDescription> : null}
          <div className="mt-4">{children}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/35 backdrop-blur-sm" />
        <Drawer.Content
          className={
            mobileContentClassName ??
            "fixed inset-x-0 bottom-0 z-[70] rounded-t-3xl bg-background p-4 pt-6 pb-10 shadow-xl"
          }
        >
          <Drawer.Title className="text-base font-semibold text-foreground">{title}</Drawer.Title>
          {description ? <div className="mt-1 text-xs text-muted-foreground">{description}</div> : null}
          <div className="mt-4">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
