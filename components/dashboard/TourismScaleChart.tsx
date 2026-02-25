"use client";

import { useEffect, useState } from "react";
import { fetchJsonOfflineFirst } from "@/lib/offline";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

const formatNumber = (v: number) =>
    new Intl.NumberFormat("pt-PT").format(v);

export function TourismScaleChart() {
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        fetchJsonOfflineFirst<{
            islands?: Array<{
                ilha?: string;
                dormidas?: number;
            }>;
        }>("/api/transparencia/turismo/overview")
            .then((res) => {
                const rows =
                    res?.islands
                        ?.map((i: any) => ({
                            ilha: i.ilha,
                            dormidas: i.dormidas,
                        }))
                        .sort((a: any, b: any) => b.dormidas - a.dormidas) || [];

                setData(rows);
            });
    }, []);

    if (!data.length) return null;

    return (
        <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
                    <XAxis
                        type="number"
                        tickFormatter={formatNumber}
                        stroke="currentColor"
                        className="text-xs text-muted-foreground"
                    />
                    <YAxis
                        type="category"
                        dataKey="ilha"
                        width={90}
                        stroke="currentColor"
                        className="text-xs"
                    />
                    <Tooltip
                        formatter={(value) =>
                            typeof value === "number" ? formatNumber(value) : "—"
                        }
                        cursor={{ fill: "transparent" }}
                    />

                    <Bar
                        dataKey="dormidas"
                        radius={[0, 6, 6, 0]}
                        className="fill-primary"
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
