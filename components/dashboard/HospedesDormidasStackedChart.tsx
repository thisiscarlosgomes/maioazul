"use client"

import { useEffect, useState } from "react"
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
  hospedes: number
  dormidas: number
}

export function HospedesDormidasStackedChart({ year }: { year: string }) {
  const [data, setData] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)

    const endpoint =
      year === "2024"
        ? "/api/transparencia/turismo/2024/baseline"
        : `/api/transparencia/turismo/overview?year=${year}`

    fetch(endpoint)
      .then((r) => r.json())
      .then((res) => {
        const islands =
          year === "2024"
            ? res.islands // baseline shape
            : res.islands // overview shape (same keys)

        const rows: Row[] =
          islands
            ?.filter((i: any) => i.ilha !== "Todas as ilhas")
            ?.map((i: any) => ({
              ilha: i.ilha,
              hospedes: i.hospedes,
              dormidas: i.dormidas,
            }))
            ?.sort(
              (a: Row, b: Row) =>
                b.hospedes + b.dormidas - (a.hospedes + a.dormidas)
            ) ?? []

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
          Hóspedes e dormidas — valores anuais ({year})
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ChartContainer config={chartConfig} className="h-[320px] w-full">
          <BarChart data={data} layout="vertical" accessibilityLayer>
            <CartesianGrid horizontal={false} />

            <XAxis type="number" tickLine={false} axisLine={false} />
            <YAxis
              dataKey="ilha"
              type="category"
              tickLine={false}
              axisLine={false}
              width={90}
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
