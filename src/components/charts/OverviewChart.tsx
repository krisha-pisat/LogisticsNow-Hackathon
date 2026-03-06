'use client';

import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

interface ChartProps {
  data: any[];
  xKey: string;
  yLineKey?: string;
  yBarKey?: string;
}

export function OverviewChart({ data, xKey, yLineKey, yBarKey }: ChartProps) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
          <XAxis 
            dataKey={xKey} 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#6B7280', fontSize: 12 }} 
            dy={10} 
          />
          <YAxis 
            yAxisId="left"
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#6B7280', fontSize: 12 }} 
            dx={-10}
            tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
          />
          {yLineKey && (
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6B7280', fontSize: 12 }} 
              dx={10}
              tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
            />
          )}
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          
          {yBarKey && (
            <Bar 
              yAxisId="left" 
              dataKey={yBarKey} 
              name="Emissions (kg)"
              fill="#22C55E" 
              radius={[4, 4, 0, 0]} 
              barSize={40}
            />
          )}
          {yLineKey && (
            <Line 
              yAxisId="right" 
              type="monotone" 
              dataKey={yLineKey} 
              name="Weight (kg)"
              stroke="#3B82F6" 
              strokeWidth={3} 
              dot={{ r: 4, strokeWidth: 2 }} 
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
