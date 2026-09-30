"use client";

import { useEffect, useState } from "react";
import { fetchJsonOfflineFirst } from "@/lib/offline";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

const formatNumber = (v: number) =>
  new Intl.NumberFormat("pt-PT").format(v);

type TourismHotelIsland = {
  ilha?: string;
  totals?: {
    establishments?: number;
    staff?: number;
    staff_per_establishment?: number;
  };
};

type AccommodationRow = {
  ilha: string;
  estabelecimentos: string;
  trabalhadores: string;
  "trabalhadores / unidade": string;
};

export function TourismAccommodationTable({
  ilha,
  year = "2025",
}: {
  ilha: string;
  year?: string;
}) {
  const [rows, setRows] = useState<AccommodationRow[]>([]);
  const [sourceYear, setSourceYear] = useState<string | null>(null);
  const [fallbackYearUsed, setFallbackYearUsed] = useState(false);

  useEffect(() => {
    fetchJsonOfflineFirst<{
      islands?: TourismHotelIsland[];
      year?: number;
      fallback_year_used?: boolean;
    }>(`/api/transparencia/turismo/hoteis?year=${year}`)
      .then((res) => {
        const islands = res.islands || [];

        const filtered =
          ilha === "Todas"
            ? islands
            : islands.filter(
                (i) =>
                  (i.ilha ?? "").toLowerCase() === ilha.toLowerCase()
              );

        setRows(
          filtered.map((i) => ({
            ilha: i.ilha ?? "—",
            estabelecimentos: formatNumber(i.totals?.establishments ?? 0),
            trabalhadores: formatNumber(i.totals?.staff ?? 0),
            "trabalhadores / unidade":
              (i.totals?.staff_per_establishment ?? 0) > 0
                ? (i.totals?.staff_per_establishment ?? 0).toFixed(1)
                : "—",
          }))
        );
        setSourceYear(
          typeof res.year === "number" ? String(res.year) : null
        );
        setFallbackYearUsed(Boolean(res.fallback_year_used));
      });
  }, [ilha, year]);

  if (!rows.length) return null;

  return (
    <section className="space-y-2">
      <div>
        <h2 className="font-semibold">
          Estrutura de Alojamento Turístico
        </h2>
        <p className="text-sm text-muted-foreground">
          Número de estabelecimentos e emprego direto no setor
          {sourceYear
            ? fallbackYearUsed
              ? ` (fallback ${sourceYear})`
              : ` (${sourceYear})`
            : ""}
        </p>
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ilha</TableHead>
              <TableHead>Estabelecimentos</TableHead>
              <TableHead>Trabalhadores</TableHead>
              <TableHead className="hidden md:table-cell">Trabalhadores / unidade</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.ilha}</TableCell>
                <TableCell>{r.estabelecimentos}</TableCell>
                <TableCell>{r.trabalhadores}</TableCell>
                <TableCell className="hidden md:table-cell">{r["trabalhadores / unidade"]}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
