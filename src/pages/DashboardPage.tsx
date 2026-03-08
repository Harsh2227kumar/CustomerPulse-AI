import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useComplaints } from '@/hooks/useComplaints';
import { useAuth } from '@/hooks/useAuth';
import AppShell from '@/components/layout/AppShell';
import KPICard from '@/components/dashboard/KPICard';
import StatusBadge from '@/components/complaint/StatusBadge';
import SeverityBadge from '@/components/complaint/SeverityBadge';
import SentimentBadge from '@/components/complaint/SentimentBadge';
import SLABadge from '@/components/complaint/SLABadge';
import CategoryBadge from '@/components/complaint/CategoryBadge';
import ChannelIcon from '@/components/complaint/ChannelIcon';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquarePlus, FileBarChart, AlertTriangle, Clock, Eye, ArrowUpDown, Filter, X } from 'lucide-react';
import PredictiveSLAWidget from '@/components/dashboard/PredictiveSLAWidget';
import { ComplaintStatus, ComplaintPriority, ComplaintCategory } from '@/types/complaint';
import { STATUS_LABELS, PRIORITY_LABELS, CATEGORY_LABELS } from '@/lib/constants';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type SortKey = 'created_at' | 'priority' | 'severity_score' | 'sla_hours_remaining';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, primaryRole, isSupervisor, profile } = useAuth();
  const { data: allComplaints = [], isLoading } = useComplaints();
  const [showFilters, setShowFilters] = useState(false);

  const complaints = useMemo(() => {
    if (isSupervisor) return allComplaints;
    return allComplaints.filter(c =>
      c.assigned_to === user?.id ||
      c.assigned_agent_name === profile?.full_name ||
      c.created_by === user?.id ||
      !c.assigned_to
    );
  }, [allComplaints, isSupervisor, user?.id, profile?.full_name]);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    let result = [...complaints];
    if (statusFilter !== 'all') result = result.filter(c => c.status === statusFilter);
    if (severityFilter !== 'all') result = result.filter(c => c.priority === severityFilter);
    if (categoryFilter !== 'all') result = result.filter(c => c.category === categoryFilter);

    result.sort((a, b) => {
      const aVal = sortKey === 'priority' ? priorityOrder(a.priority) : (a as any)[sortKey];
      const bVal = sortKey === 'priority' ? priorityOrder(b.priority) : (b as any)[sortKey];
      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });
    return result;
  }, [complaints, statusFilter, severityFilter, categoryFilter, sortKey, sortAsc]);

  const activeFilters = [statusFilter, severityFilter, categoryFilter].filter(f => f !== 'all').length;

  const openCount = complaints.filter(c => !['resolved', 'closed'].includes(c.status)).length;
  const criticalCount = complaints.filter(c => c.priority === 'critical' && !['resolved', 'closed'].includes(c.status)).length;
  const slaCompliance = complaints.length > 0 ? Math.round((complaints.filter(c => c.sla_status !== 'breached').length / complaints.length) * 100) : 100;

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  }

  function clearFilters() {
    setStatusFilter('all');
    setSeverityFilter('all');
    setCategoryFilter('all');
  }

  if (isLoading) {
    return (
      <AppShell title="Complaints Dashboard">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </AppShell>
    );
  }

  return (
    <AppShell title="Complaints Dashboard">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <KPICard title="Total Complaints" value={complaints.length} change="+12% vs last week" changeType="negative" icon={FileBarChart} />
        <KPICard title="Open Complaints" value={openCount} change={`${criticalCount} critical`} changeType="negative" icon={MessageSquarePlus} />
        <KPICard title="SLA Compliance" value={`${slaCompliance}%`} change="+3% vs last week" changeType="positive" icon={Clock} />
        <KPICard title="At Risk / Breached" value={complaints.filter(c => c.sla_status !== 'on_track').length} change="Needs attention" changeType="negative" icon={AlertTriangle} iconClassName="bg-severity-critical-bg text-severity-critical" />
      </div>

      {/* Toolbar: Filters + New Complaint */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <Filter className="w-4 h-4 mr-1.5" />
            Filters
            {activeFilters > 0 && (
              <Badge className="ml-1.5 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground rounded-full">
                {activeFilters}
              </Badge>
            )}
          </Button>
          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground">
              <X className="w-3 h-3 mr-1" /> Clear
            </Button>
          )}
        </div>
        <div className="sm:ml-auto">
          <Button variant="default" size="sm" onClick={() => navigate('/new-complaint')} className="w-full sm:w-auto">
            <MessageSquarePlus className="w-4 h-4 mr-1.5" />
            New Complaint
          </Button>
        </div>
      </div>

      {/* Filter dropdowns */}
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 p-3 bg-muted/50 rounded-lg border border-border">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Main content: Table + SLA widget */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 md:gap-6">
        <div className="xl:col-span-3 min-w-0">
          {/* Mobile card view */}
          <div className="block lg:hidden space-y-3">
            {filtered.length === 0 && (
              <Card className="p-8 text-center text-muted-foreground text-sm">
                No complaints found. Create your first complaint to get started.
              </Card>
            )}
            {filtered.map((complaint) => (
              <Card
                key={complaint.id}
                className="p-4 cursor-pointer hover:shadow-md transition-shadow border border-border"
                onClick={() => navigate(`/complaint/${complaint.id}`)}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-medium text-primary">{complaint.ticket_id}</span>
                      <ChannelIcon channel={complaint.channel} />
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">{complaint.customer_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{complaint.subject}</p>
                  </div>
                  <StatusBadge status={complaint.status} />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={complaint.priority} />
                  <CategoryBadge category={complaint.category} />
                  <SLABadge status={complaint.sla_status} hoursRemaining={complaint.sla_hours_remaining} />
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-2">
                    {complaint.assigned_agent_name ? (
                      <>
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[8px] bg-secondary text-secondary-foreground">
                            {complaint.assigned_agent_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">{complaint.assigned_agent_name}</span>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Unassigned</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{format(new Date(complaint.created_at), 'dd MMM, HH:mm')}</span>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="hidden lg:block bg-card rounded-lg border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Ticket ID</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Customer</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-2 py-3 w-10">Ch</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Category</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 cursor-pointer select-none" onClick={() => handleSort('priority')}>
                      <span className="flex items-center gap-1">Severity <ArrowUpDown className="w-3 h-3" /></span>
                    </th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 hidden 2xl:table-cell">Sentiment</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Assigned To</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 cursor-pointer select-none" onClick={() => handleSort('sla_hours_remaining')}>
                      <span className="flex items-center gap-1">SLA <ArrowUpDown className="w-3 h-3" /></span>
                    </th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Status</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 cursor-pointer select-none" onClick={() => handleSort('created_at')}>
                      <span className="flex items-center gap-1">Created <ArrowUpDown className="w-3 h-3" /></span>
                    </th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-2 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={11} className="text-center py-12 text-muted-foreground">
                        No complaints found. Create your first complaint to get started.
                      </td>
                    </tr>
                  )}
                  {filtered.map((complaint) => (
                    <tr
                      key={complaint.id}
                      className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/complaint/${complaint.id}`)}
                    >
                      <td className="px-4 py-3 text-xs font-mono font-medium text-primary whitespace-nowrap">{complaint.ticket_id}</td>
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate max-w-[160px]">{complaint.customer_name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[160px]">{complaint.subject}</p>
                        </div>
                      </td>
                      <td className="px-2 py-3"><ChannelIcon channel={complaint.channel} /></td>
                      <td className="px-4 py-3"><CategoryBadge category={complaint.category} /></td>
                      <td className="px-4 py-3"><SeverityBadge severity={complaint.priority} /></td>
                      <td className="px-4 py-3 hidden 2xl:table-cell"><SentimentBadge sentiment={complaint.sentiment} /></td>
                      <td className="px-4 py-3">
                        {complaint.assigned_agent_name ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6 flex-shrink-0">
                              <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">
                                {complaint.assigned_agent_name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-foreground truncate max-w-[100px]">{complaint.assigned_agent_name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3"><SLABadge status={complaint.sla_status} hoursRemaining={complaint.sla_hours_remaining} /></td>
                      <td className="px-4 py-3"><StatusBadge status={complaint.status} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{format(new Date(complaint.created_at), 'dd MMM, HH:mm')}</td>
                      <td className="px-2 py-3">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); navigate(`/complaint/${complaint.id}`); }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-3 text-xs text-muted-foreground">
            Showing {filtered.length} of {complaints.length} complaints
          </div>
        </div>

        {/* SLA Widget */}
        <div className="xl:col-span-1">
          <PredictiveSLAWidget />
        </div>
      </div>
    </AppShell>
  );
}

function priorityOrder(p: string): number {
  return { critical: 4, high: 3, medium: 2, low: 1 }[p] || 0;
}
