import { useMemo } from 'react';
import { mockComplaints } from '@/data/mockData';
import AppShell from '@/components/layout/AppShell';
import KPICard from '@/components/dashboard/KPICard';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line, Area, AreaChart,
} from 'recharts';
import { FileBarChart, Clock, ShieldCheck, TrendingUp } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { mockAgents } from '@/data/mockData';

const COLORS = ['#2563EB', '#7C3AED', '#F59E0B', '#06B6D4', '#EC4899', '#EF4444', '#6B7280'];

export default function AnalyticsPage() {
  const stats = useMemo(() => {
    const total = mockComplaints.length;
    const resolved = mockComplaints.filter(c => c.status === 'resolved' || c.status === 'closed').length;
    const avgResolution = 18.5;
    const slaCompliance = Math.round((mockComplaints.filter(c => c.sla_status !== 'breached').length / total) * 100);

    // Volume over time (last 7 days)
    const volumeData = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const count = 2 + Math.floor(Math.random() * 5);
      return { date: format(date, 'dd MMM'), complaints: count };
    });

    // Category distribution
    const catMap: Record<string, number> = {};
    mockComplaints.forEach(c => { catMap[c.category] = (catMap[c.category] || 0) + 1; });
    const categoryData = Object.entries(catMap).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

    // Sentiment trend
    const sentimentData = Array.from({ length: 6 }, (_, i) => ({
      week: `W${i + 1}`,
      positive: Math.floor(Math.random() * 3) + 1,
      neutral: Math.floor(Math.random() * 4) + 2,
      negative: Math.floor(Math.random() * 5) + 3,
      angry: Math.floor(Math.random() * 3),
    }));

    // Agent performance
    const agentPerf = mockAgents.map(agent => {
      const assigned = mockComplaints.filter(c => c.assigned_to === agent.id);
      const resolvedByAgent = assigned.filter(c => c.status === 'resolved' || c.status === 'closed');
      return {
        name: agent.name,
        department: agent.department,
        handled: assigned.length,
        resolved: resolvedByAgent.length,
        avgTime: assigned.length > 0 ? `${(8 + Math.random() * 20).toFixed(1)}h` : '-',
        sla: assigned.length > 0 ? `${Math.round((resolvedByAgent.length / Math.max(assigned.length, 1)) * 100)}%` : '-',
      };
    });

    return { total, resolved, avgResolution, slaCompliance, volumeData, categoryData, sentimentData, agentPerf };
  }, []);

  return (
    <AppShell title="Analytics">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard title="Total (MTD)" value={stats.total} change="+12% vs last month" changeType="negative" icon={FileBarChart} />
        <KPICard title="Resolved" value={stats.resolved} change={`${Math.round((stats.resolved / stats.total) * 100)}% rate`} changeType="positive" icon={ShieldCheck} />
        <KPICard title="Avg Resolution" value={`${stats.avgResolution}h`} change="-2.3h vs last month" changeType="positive" icon={Clock} />
        <KPICard title="SLA Compliance" value={`${stats.slaCompliance}%`} change="+3% vs last month" changeType="positive" icon={TrendingUp} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-5 border border-border">
          <h3 className="text-sm font-semibold text-foreground mb-4">Complaint Volume (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={stats.volumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(215 16% 47%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(215 16% 47%)" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(214 32% 91%)' }} />
              <defs>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="complaints" stroke="#2563EB" fill="url(#blueGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 border border-border">
          <h3 className="text-sm font-semibold text-foreground mb-4">Category Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={stats.categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {stats.categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-5 border border-border">
          <h3 className="text-sm font-semibold text-foreground mb-4">Sentiment Trend (6 Weeks)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.sentimentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="hsl(215 16% 47%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(215 16% 47%)" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="positive" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="neutral" stackId="a" fill="#94A3B8" />
              <Bar dataKey="negative" stackId="a" fill="#EF4444" />
              <Bar dataKey="angry" stackId="a" fill="#991B1B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 border border-border">
          <h3 className="text-sm font-semibold text-foreground mb-4">SLA Compliance Gauge</h3>
          <div className="flex flex-col items-center justify-center h-[260px]">
            <div className="relative w-40 h-40">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(214 32% 91%)" strokeWidth="10" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="#2563EB" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${stats.slaCompliance * 3.14} ${314 - stats.slaCompliance * 3.14}`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-foreground">{stats.slaCompliance}%</span>
                <span className="text-xs text-muted-foreground">SLA Met</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">Target: 95% | Current: {stats.slaCompliance}%</p>
          </div>
        </Card>
      </div>

      {/* Agent Leaderboard */}
      <Card className="p-5 border border-border">
        <h3 className="text-sm font-semibold text-foreground mb-4">Agent Performance Leaderboard</h3>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs font-semibold">Agent</TableHead>
              <TableHead className="text-xs font-semibold">Department</TableHead>
              <TableHead className="text-xs font-semibold text-center">Handled</TableHead>
              <TableHead className="text-xs font-semibold text-center">Resolved</TableHead>
              <TableHead className="text-xs font-semibold text-center">Avg Time</TableHead>
              <TableHead className="text-xs font-semibold text-center">SLA Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.agentPerf.map((a) => (
              <TableRow key={a.name} className="hover:bg-muted/30">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">
                        {a.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground">{a.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{a.department}</TableCell>
                <TableCell className="text-center text-sm font-medium">{a.handled}</TableCell>
                <TableCell className="text-center text-sm font-medium text-severity-low">{a.resolved}</TableCell>
                <TableCell className="text-center text-xs font-mono">{a.avgTime}</TableCell>
                <TableCell className="text-center text-xs font-medium">{a.sla}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </AppShell>
  );
}
