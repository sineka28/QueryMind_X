import { useRef, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { BarChart3, LineChart as LineIcon, AreaChart as AreaIcon, PieChart as PieIcon, Download } from "lucide-react";
import type { ChartConfig } from "@/lib/utils";
import { useToast } from "@/lib/toast";

const COLORS = ["#38bdf8", "#a78bfa", "#34d399", "#fbbf24", "#fb7185", "#f472b6", "#22d3ee", "#a3e635"];

interface ChartViewProps {
  rows: Record<string, unknown>[];
  config: ChartConfig;
}

export function ChartView({ rows, config }: ChartViewProps) {
  const [chartType, setChartType] = useState<ChartConfig["chartType"]>(config.chartType);
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  if (chartType === "none" || !config.xKey || !config.yKeys.length) {
    return null;
  }

  const data = rows.map((r) => {
    const obj: Record<string, string | number> = {};
    obj[config.xKey!] = String(r[config.xKey!]);
    for (const yk of config.yKeys) {
      const val = r[yk];
      obj[yk] = typeof val === "number" ? val : Number(String(val).replace(/[$,%\s]/g, "")) || 0;
    }
    return obj;
  });

  const handleDownloadPng = () => {
    const container = containerRef.current;
    if (!container) return;
    const svg = container.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = svg.clientWidth || 800;
      canvas.height = svg.clientHeight || 400;
      ctx.fillStyle = "#0f1424";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const dlUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = dlUrl;
        a.download = "querymind-chart.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(dlUrl);
        toast("export", "Chart downloaded as PNG");
      });
    };
    img.src = url;
  };

  const buttons: { type: ChartConfig["chartType"]; icon: typeof BarChart3 }[] = [
    { type: "bar", icon: BarChart3 },
    { type: "line", icon: LineIcon },
    { type: "area", icon: AreaIcon },
    { type: "pie", icon: PieIcon },
  ];

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-200">Visualization</h3>
        <div className="flex items-center gap-1">
          {buttons.map((b) => {
            const Icon = b.icon;
            return (
              <button
                key={b.type}
                onClick={() => setChartType(b.type)}
                className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                  chartType === b.type
                    ? "bg-sky-500/20 text-sky-400"
                    : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
                }`}
                aria-label={`Switch to ${b.type} chart`}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            );
          })}
          <button
            onClick={handleDownloadPng}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-colors"
            aria-label="Download chart"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div ref={containerRef} className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "pie" ? (
            <PieChart>
              <Pie
                data={data}
                dataKey={config.yKeys[0]}
                nameKey={config.xKey}
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(e: { name?: string }) => e.name ?? ""}
                animationDuration={800}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#0f1424", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
              />
            </PieChart>
          ) : chartType === "line" ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey={config.xKey} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#0f1424", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
              {config.yKeys.map((yk, i) => (
                <Line key={yk} type="monotone" dataKey={yk} stroke={COLORS[i]} strokeWidth={2} dot={{ r: 3 }} animationDuration={800} />
              ))}
            </LineChart>
          ) : chartType === "area" ? (
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey={config.xKey} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#0f1424", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
              {config.yKeys.map((yk, i) => (
                <Area key={yk} type="monotone" dataKey={yk} stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.2} animationDuration={800} />
              ))}
            </AreaChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey={config.xKey} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#0f1424", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              {config.yKeys.map((yk, i) => (
                <Bar key={yk} dataKey={yk} fill={COLORS[i]} radius={[4, 4, 0, 0]} animationDuration={800} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
