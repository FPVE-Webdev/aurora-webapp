/**
 * Metrics Timeline Component
 *
 * Displays queries per minute over the last 30 minutes using Recharts
 */

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TimelineData {
  timestamp: string;
  count: number;
  queriesPerMinute: number;
}

interface MetricsTimelineProps {
  data: TimelineData[];
  isLoading?: boolean;
}

function formatTimeLabel(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-arctic-900 border border-white/20 rounded-lg p-3 shadow-lg">
      <p className="text-white text-sm font-semibold">{formatTimeLabel(data.timestamp)}</p>
      <p className="text-primary text-sm">
        {data.queriesPerMinute.toFixed(1)} queries/min
      </p>
      <p className="text-white/60 text-xs">({data.count} queries)</p>
    </div>
  );
}

export function MetricsTimeline({ data, isLoading = false }: MetricsTimelineProps) {
  if (isLoading || !data || data.length === 0) {
    return (
      <div className="bg-arctic-800 border border-white/10 rounded-lg p-6 h-[300px] flex items-center justify-center">
        <p className="text-white/60 text-center">
          {isLoading ? 'Loading timeline...' : 'No data yet'}
        </p>
      </div>
    );
  }

  // Ensure data is sorted by timestamp
  const sortedData = [...data].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Format data for Recharts
  const chartData = sortedData.map((item) => ({
    ...item,
    timeLabel: formatTimeLabel(item.timestamp),
  }));

  // Calculate min/max for Y-axis
  const queriesList = chartData.map((d) => d.queriesPerMinute);
  const maxQPM = Math.max(...queriesList, 1);
  const minQPM = Math.min(...queriesList, 0);
  const padding = (maxQPM - minQPM) * 0.2;

  return (
    <div className="bg-arctic-800 border border-white/10 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Queries per Minute (30m)</h3>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
        >
          <defs>
            <linearGradient id="colorQPM" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255, 255, 255, 0.1)"
            vertical={false}
          />

          <XAxis
            dataKey="timeLabel"
            tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 12 }}
            axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
            tickLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
            interval={Math.max(0, Math.floor(chartData.length / 6))}
          />

          <YAxis
            domain={[Math.max(0, minQPM - padding), maxQPM + padding]}
            tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 12 }}
            axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
            tickLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
            width={40}
          />

          <Tooltip content={<CustomTooltip />} />

          <Line
            type="monotone"
            dataKey="queriesPerMinute"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
            animationDuration={300}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Stats Footer */}
      <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-3 gap-4">
        <div>
          <p className="text-white/60 text-xs">Current</p>
          <p className="text-white font-semibold">
            {chartData[chartData.length - 1]?.queriesPerMinute.toFixed(1) || '0'} qpm
          </p>
        </div>
        <div>
          <p className="text-white/60 text-xs">Average</p>
          <p className="text-white font-semibold">
            {(queriesList.reduce((a, b) => a + b, 0) / queriesList.length).toFixed(1)} qpm
          </p>
        </div>
        <div>
          <p className="text-white/60 text-xs">Peak</p>
          <p className="text-white font-semibold">{maxQPM.toFixed(1)} qpm</p>
        </div>
      </div>
    </div>
  );
}
