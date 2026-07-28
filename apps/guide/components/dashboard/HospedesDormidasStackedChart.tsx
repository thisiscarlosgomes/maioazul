"use client"

import { useEffect, useState } from "react"
import { fetchJsonOfflineFirst } from "@/lib/offline"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartConfig = {
  hospedes: {
    label: "Hóspedes",
    color: "var(--chart-1)",
  },
  dormidas: {
    label: "Dormidas",
    color: "var(--chart-2)",
  },
}

type Row = {
  ilha: string
  axisLabel: string
  hospedes: number
  dormidas: number
  hospedesShareNational: number
  dormidasShareNational: number
}

const formatShare = (value: number) =>
  `${new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)}%`

export function HospedesDormidasStackedChart({ year }: { year: string }) {
  const [data, setData] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)

    const endpoint =
      year === "2024"
        ? "/api/transparencia/turismo/2024/baseline"
        : `/api/transparencia/turismo/overview?year=${year}`

    fetchJsonOfflineFirst<{
      islands?: Array<{
        ilha?: string
        hospedes?: number
        dormidas?: number
      }>
    }>(endpoint)
      .then((res) => {
        const islands =
          year === "2024"
            ? res.islands // baseline shape
            : res.islands // overview shape (same keys)

        const baseRows =
          islands
            ?.filter((i) => i.ilha && i.ilha !== "Todas as ilhas")
            ?.map((i) => ({
              ilha: String(i.ilha),
              hospedes: Number(i.hospedes ?? 0),
              dormidas: Number(i.dormidas ?? 0),
            })) ?? []

        const totals = baseRows.reduce(
          (acc, row) => {
            acc.hospedes += row.hospedes
            acc.dormidas += row.dormidas
            return acc
          },
          { hospedes: 0, dormidas: 0 }
        )

        const rows: Row[] = baseRows
          .map((row) => {
            const hospedesShareNational =
              totals.hospedes > 0 ? (row.hospedes / totals.hospedes) * 100 : 0
            const dormidasShareNational =
              totals.dormidas > 0 ? (row.dormidas / totals.dormidas) * 100 : 0

            return {
              ilha: row.ilha,
              axisLabel: `${row.ilha} (H ${formatShare(hospedesShareNational)} · D ${formatShare(dormidasShareNational)})`,
              hospedes: row.hospedes,
              dormidas: row.dormidas,
              hospedesShareNational,
              dormidasShareNational,
            }
          })
          .sort(
            (a, b) =>
              b.hospedes + b.dormidas - (a.hospedes + a.dormidas)
          )

        setData(rows)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [year])

  if (loading || !data.length) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Turismo por ilha</CardTitle>
        <CardDescription>
          Hóspedes e dormidas — valores anuais ({year}) + % nacional por ilha
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ChartContainer config={chartConfig} className="h-[320px] w-full">
          <BarChart data={data} layout="vertical" accessibilityLayer>
            <CartesianGrid horizontal={false} />

            <XAxis type="number" tickLine={false} axisLine={false} />
            <YAxis
              dataKey="axisLabel"
              type="category"
              tickLine={false}
              axisLine={false}
              width={260}
            />

            <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
            <ChartLegend content={<ChartLegendContent />} />

            <Bar
              dataKey="hospedes"
              stackId="a"
              fill="var(--color-hospedes)"
              radius={[4, 0, 0, 4]}
              barSize={18}
            />

            <Bar
              dataKey="dormidas"
              stackId="a"
              fill="var(--color-dormidas)"
              radius={[0, 4, 4, 0]}
              barSize={18}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
