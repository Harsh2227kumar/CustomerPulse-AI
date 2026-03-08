import { useMemo } from 'react';
import { useComplaints, useAgents } from '@/hooks/useComplaints';
import AppShell from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { Trophy, Clock, ShieldCheck, TrendingUp, AlertTriangle, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentScore {
  id: string;
  name: string;
  department: string;
  avatar_url?: string;
  totalHandled: number;
  resolved: number;
  open: number;
  avgResolutionHours: number;
  slaComplianceRate: number;
  slaBreach: number;
  firstResponseRate: number;
  currentLoad: number;
  maxComplaints: number;
  overallScore: number;
}

export default function AgentPerformancePage() {
  const { data: complaints = [], isLoading: lc } = useComplaints();
  const { data: agents = [], isLoading: la } = useAgents();

  const scores: AgentScore[] = useMemo(() => {
    return agents
      .filter(a => a.is_active)
      .map(agent => {
        const assigned = complaints.filter(c => c.assigned_to === agent.id);
        const resolvedComplaints = assigned.filter(c => c.status === 'resolved' || c.status === 'closed');
        const openComplaints = assigned.filter(c => !['resolved', 'closed'].includes(c.status));
        const breached = assigned.filter(c => c.sla_status === 'breached');
        const withFirstResponse = assigned.filter(c => c.first_response_at);

        // Calculate avg resolution hours
        let avgHours = 0;
        const resolvedWithDates = resolvedComplaints.filter(c => c.resolved_at);
        if (resolvedWithDates.length > 0) {
          const totalHours = resolvedWithDates.reduce((sum, c) => {
            const created = new Date(c.created_at).getTime();
            const resolved = new Date(c.resolved_at!).getTime();
            return sum + (resolved - created) / 3600000;
          }, 0);
          avgHours = totalHours / resolvedWithDates.length;
        }

        const slaRate = assigned.length > 0
          ? Math.round(((assigned.length - breached.length) / assigned.length) * 100)
          : 100;

        const firstRespRate = assigned.length > 0
          ? Math.round((withFirstResponse.length / assigned.length) * 100)
          : 0;

        // Overall score (weighted)
        const resolutionScore = assigned.length > 0 ? Math.min(100, (resolvedComplaints.length / Math.max(assigned.length, 1)) * 100) : 0;
        const speedScore = avgHours > 0 ? Math.max(0, 100 - (avgHours / 48 * 100)) : 50;
        const overallScore = Math.round(
          resolutionScore * 0.3 +
          slaRate * 0.3 +
          speedScore * 0.2 +
          firstRespRate * 0.2
        );

        return {
          id: agent.id,
          name: agent.name,
          department: agent.department || 'General',
          avatar_url: agent.avatar_url,
          totalHandled: assigned.length,
          resolved: resolvedComplaints.length,
          open: openComplaints.length,
          avgResolutionHours: Math.round(avgHours * 10) / 10,
          slaComplianceRate: slaRate,
          slaBreach: breached.length,
          firstResponseRate: firstRespRate,
          currentLoad: agent.current_load,
          maxComplaints: agent.max_complaints,
          overallScore,
        };
      })
      .sort((a, b) => b.overallScore - a.overallScore);
  }, [complaints, agents]);

  const comparisonData = useMemo(() => {
    return scores.map(s => ({
      name: s.name.split(' ')[0],
      'Resolved': s.resolved,
      'Open': s.open,
      'SLA Breached': s.slaBreach,
    }));
  }, [scores]);

  const radarData = useMemo(() => {
    if (scores.length === 0) return [];
    const top3 = scores.slice(0, 3);
    const metrics = ['Resolution Rate', 'SLA Compliance', 'Speed', 'Response Rate', 'Volume'];
    return metrics.map(metric => {
      const entry: any = { metric };
      top3.forEach(agent => {
        const firstName = agent.name.split(' ')[0];
        switch (metric) {
          case 'Resolution Rate':
            entry[firstName] = agent.totalHandled > 0 ? Math.round((agent.resolved / agent.totalHandled) * 100) : 0;
            break;
          case 'SLA Compliance':
            entry[firstName] = agent.slaComplianceRate;
            break;
          case 'Speed':
            entry[firstName] = agent.avgResolutionHours > 0 ? Math.max(0, 100 - (agent.avgResolutionHours / 48 * 100)) : 50;
            break;
          case 'Response Rate':
            entry[firstName] = agent.firstResponseRate;
            break;
          case 'Volume':
            const maxVol = Math.max(...scores.map(s => s.totalHandled), 1);
            entry[firstName] = Math.round((agent.totalHandled / maxVol) * 100);
            break;
        }
      });
      return entry;
    });
  }, [scores]);

  const RADAR_COLORS = ['#2563EB', '#7C3AED', '#F59E0B'];

  if (lc || la) {
    return (
      <AppShell title="Agent Performance">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </AppShell>
    );
  }

  const avgScore = scores.length > 0 ? Math.round(scores.reduce((s, a) => s + a.overallScore, 0) / scores.length) : 0;
  const avgSla = scores.length > 0 ? Math.round(scores.reduce((s, a) => s + a.slaComplianceRate, 0) / scores.length) : 0;
  const totalResolved = scores.reduce((s, a) => s + a.resolved, 0);
  const topPerformer = scores[0];

  return (
    <AppShell title="Agent Performance">
      {/* Team KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-severity-medium" />
            <span className="text-xs text-muted-foreground">Top Performer</span>
          </div>
          <p className="text-lg font-bold text-foreground">{topPerformer?.name || '-'}</p>
          <p className="text-xs text-muted-foreground">Score: {topPerformer?.overallScore || 0}/100</p>
        </Card>
        <Card className="p-4 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Team Avg Score</span>
          </div>
          <p className="text-lg font-bold text-foreground">{avgScore}/100</p>
        </Card>
        <Card className="p-4 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-severity-low" />
            <span className="text-xs text-muted-foreground">Avg SLA Compliance</span>
          </div>
          <p className="text-lg font-bold text-foreground">{avgSla}%</p>
        </Card>
        <Card className="p-4 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Total Resolved</span>
          </div>
          <p className="text-lg font-bold text-foreground">{totalResolved}</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-5 border border-border">
          <h3 className="text-sm font-semibold text-foreground mb-4">Agent Comparison — Complaint Volume</h3>
          {comparisonData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(215 16% 47%)" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(215 16% 47%)" allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(214 32% 91%)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Resolved" stackId="a" fill="#22C55E" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Open" stackId="a" fill="#2563EB" radius={[0, 0, 0, 0]} />
                <Bar dataKey="SLA Breached" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">No data yet</div>
          )}
        </Card>

        <Card className="p-5 border border-border">
          <h3 className="text-sm font-semibold text-foreground mb-4">Top 3 Agents — Skills Radar</h3>
          {radarData.length > 0 && scores.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(214 32% 91%)" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: 'hsl(215 16% 47%)' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                {scores.slice(0, 3).map((agent, i) => (
                  <Radar
                    key={agent.id}
                    name={agent.name.split(' ')[0]}
                    dataKey={agent.name.split(' ')[0]}
                    stroke={RADAR_COLORS[i]}
                    fill={RADAR_COLORS[i]}
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                ))}
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">Need at least 1 agent with data</div>
          )}
        </Card>
      </div>

      {/* Scorecards */}
      <h3 className="text-sm font-semibold text-foreground mb-4">Individual Scorecards</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {scores.map((agent, rank) => (
          <Card key={agent.id} className="p-5 border border-border">
            <div className="flex items-center gap-3 mb-4">
              {rank < 3 && (
                <span className={cn(
                  'text-lg',
                  rank === 0 ? 'text-severity-medium' : rank === 1 ? 'text-muted-foreground' : 'text-severity-high'
                )}>
                  {rank === 0 ? '🥇' : rank === 1 ? '🥈' : '🥉'}
                </span>
              )}
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {agent.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{agent.name}</p>
                <p className="text-xs text-muted-foreground">{agent.department}</p>
              </div>
              <div className="text-right">
                <p className={cn(
                  'text-xl font-bold',
                  agent.overallScore >= 80 ? 'text-severity-low' :
                  agent.overallScore >= 50 ? 'text-severity-medium' : 'text-severity-critical'
                )}>
                  {agent.overallScore}
                </p>
                <p className="text-[10px] text-muted-foreground">Score</p>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-lg font-bold text-foreground">{agent.totalHandled}</p>
                <p className="text-[10px] text-muted-foreground">Total Handled</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-lg font-bold text-severity-low">{agent.resolved}</p>
                <p className="text-[10px] text-muted-foreground">Resolved</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-lg font-bold text-foreground">{agent.avgResolutionHours || '-'}h</p>
                <p className="text-[10px] text-muted-foreground">Avg Resolution</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className={cn('text-lg font-bold', agent.slaBreach > 0 ? 'text-severity-critical' : 'text-severity-low')}>
                  {agent.slaBreach}
                </p>
                <p className="text-[10px] text-muted-foreground">SLA Breached</p>
              </div>
            </div>

            {/* SLA Compliance Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">SLA Compliance</span>
                <span className={cn(
                  'text-xs font-bold',
                  agent.slaComplianceRate >= 90 ? 'text-severity-low' :
                  agent.slaComplianceRate >= 70 ? 'text-severity-medium' : 'text-severity-critical'
                )}>
                  {agent.slaComplianceRate}%
                </span>
              </div>
              <Progress value={agent.slaComplianceRate} className="h-2" />
            </div>

            {/* Workload */}
            <div className="mt-3 flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Current Workload</span>
              <div className="flex items-center gap-2">
                <Progress value={(agent.currentLoad / agent.maxComplaints) * 100} className="h-1.5 w-16" />
                <span className="text-[10px] text-muted-foreground">{agent.currentLoad}/{agent.maxComplaints}</span>
              </div>
            </div>
          </Card>
        ))}

        {scores.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No active agents found
          </div>
        )}
      </div>
    </AppShell>
  );
}
