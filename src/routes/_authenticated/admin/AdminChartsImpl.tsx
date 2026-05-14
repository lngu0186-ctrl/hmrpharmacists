import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell, Legend } from "recharts";
import { Card } from "@/components/ui/card";
import type { ChartProps } from "./AdminCharts";

const COLORS = ["var(--primary)", "var(--accent)", "var(--destructive)", "var(--success)"];

export default function AdminChartsImpl({ statusData, stateData }: ChartProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h3 className="mb-4 text-sm font-medium">Verification status</h3>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
              {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>
      <Card className="p-5">
        <h3 className="mb-4 text-sm font-medium">Coverage by state</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stateData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="state" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} />
            <Tooltip />
            <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
