"use client";

import { Drawer } from "vaul";
import { useEffect, useState } from "react";

export type Place = {
  id: string;
  name: {
    pt: string;
    en: string;
  };
  description: {
    pt: string;
    en: string;
  };
  image_url?: string;
};

export function PlacesDrawer({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect?: (place: Place) => void;
}) {
  const [places, setPlaces] = useState<Place[]>([]);

  useEffect(() => {
    fetch("/data/maio_places_with_coords.json")
      .then((r) => r.json())
      .then(setPlaces);
  }, []);

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} direction="right">
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" />

        <Drawer.Content
          className="fixed right-2 top-2 bottom-2 z-50 w-full outline-none flex"
          style={
            {
              "--initial-transform": "calc(100% + 8px)",
            } as React.CSSProperties
          }
        >
          <div className="flex h-full w-full flex-col rounded-[16px] bg-background border border-border shadow-lg overflow-hidden">
            
            {/* Header */}
            <div className="px-5 pt-6 pb-5 border-b border-border">
              <Drawer.Title className="text-base font-semibold leading-tight">
                Escolha um lugar
              </Drawer.Title>
              <p className="text-xs text-muted-foreground mt-1">
                Passeie por praias, povoações e áreas protegidas.
              </p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
              {places.map((place) => (
                <button
                  key={place.id}
                  onClick={() => {
                    onSelect?.(place);
                    onOpenChange(false);
                  }}
                  className="
                    w-full text-left rounded-lg border border-border
                    p-4 hover:bg-muted transition duration-300 ease-out
                  "
                >
                  <div className="flex gap-3">
                    <img
                      src={place.image_url || "/image.png"}
                      alt=""
                      className="w-24 h-24 rounded-md object-cover border"
                    />

                    <div className="space-y-1">
                      <div className="font-medium text-sm">
                        {place.name.pt}
                      </div>
                      <div className="text-xs text-muted-foreground ">
                        {place.description.pt}
                      </div>
                    </div>
                  </div>
                </button>
              ))}

              {places.length === 0 && (
                <p className="text-sm text-muted-foreground px-2">
                  A carregar lugares...
                </p>
              )}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
