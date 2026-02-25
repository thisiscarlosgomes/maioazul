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

export function TourismAccommodationTable({
  ilha,
}: {
  ilha: string;
}) {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    fetchJsonOfflineFirst<{
      islands?: Array<{
        ilha?: string;
        totals?: {
          establishments?: number;
          staff?: number;
          staff_per_establishment?: number;
        };
      }>;
    }>("/api/transparencia/turismo/hoteis")
      .then((res) => {
        const islands = res.islands || [];

        const filtered =
          ilha === "Todas"
            ? islands
            : islands.filter(
                (i: any) =>
                  i.ilha.toLowerCase() === ilha.toLowerCase()
              );

        setRows(
          filtered.map((i: any) => ({
            ilha: i.ilha,
            estabelecimentos: formatNumber(i.totals.establishments),
            trabalhadores: formatNumber(i.totals.staff),
            "trabalhadores / unidade":
              i.totals.staff_per_establishment > 0
                ? i.totals.staff_per_establishment.toFixed(1)
                : "—",
          }))
        );
      });
  }, [ilha]);

  if (!rows.length) return null;

  return (
    <section className="space-y-2">
      <div>
        <h2 className="font-semibold">
          Estrutura de Alojamento Turístico
        </h2>
        <p className="text-sm text-muted-foreground">
          Número de estabelecimentos e emprego direto no setor (dados 2024)
        </p>
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ilha</TableHead>
              <TableHead>Estabelecimentos</TableHead>
              <TableHead>Trabalhadores</TableHead>
              <TableHead>Trabalhadores / unidade</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.ilha}</TableCell>
                <TableCell>{r.estabelecimentos}</TableCell>
                <TableCell>{r.trabalhadores}</TableCell>
                <TableCell>{r["trabalhadores / unidade"]}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
