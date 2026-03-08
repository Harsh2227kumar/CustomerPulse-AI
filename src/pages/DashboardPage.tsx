import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockComplaints, mockAgents } from '@/data/mockData';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquarePlus, FileBarChart, AlertTriangle, Clock, Eye, ArrowUpDown } from 'lucide-react';
import { ComplaintStatus, ComplaintPriority, ComplaintCategory } from '@/types/complaint';
import { STATUS_LABELS, PRIORITY_LABELS, CATEGORY_LABELS } from '@/lib/constants';
import { format } from 'date-fns';

type SortKey = 'created_at' | 'priority' | 'severity_score' | 'sla_hours_remaining';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    let result = [...mockComplaints];
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
  }, [statusFilter, severityFilter, categoryFilter, sortKey, sortAsc]);

  const openCount = mockComplaints.filter(c => !['resolved', 'closed'].includes(c.status)).length;
  const criticalCount = mockComplaints.filter(c => c.priority === 'critical' && !['resolved', 'closed'].includes(c.status)).length;
  const resolvedToday = mockComplaints.filter(c => c.resolved_at && new Date(c.resolved_at).toDateString() === new Date().toDateString()).length;
  const slaCompliance = Math.round((mockComplaints.filter(c => c.sla_status !== 'breached').length / mockComplaints.length) * 100);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  }

  return (
    <AppShell title="Complaints Dashboard">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard title="Total Complaints" value={mockComplaints.length} change="+12% vs last week" changeType="negative" icon={FileBarChart} />
        <KPICard title="Open Complaints" value={openCount} change={`${criticalCount} critical`} changeType="negative" icon={MessageSquarePlus} />
        <KPICard title="SLA Compliance" value={`${slaCompliance}%`} change="+3% vs last week" changeType="positive" icon={Clock} />
        <KPICard title="At Risk / Breached" value={mockComplaints.filter(c => c.sla_status !== 'on_track').length} change="Needs attention" changeType="negative" icon={AlertTriangle} iconClassName="bg-severity-critical-bg text-severity-critical" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-40 h-9 text-sm"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40 h-9 text-sm"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Button variant="default" size="sm" onClick={() => navigate('/new-complaint')}>
            <MessageSquarePlus className="w-4 h-4 mr-1.5" />
            New Complaint
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold">Ticket ID</TableHead>
                <TableHead className="text-xs font-semibold">Customer</TableHead>
                <TableHead className="text-xs font-semibold w-10">Ch</TableHead>
                <TableHead className="text-xs font-semibold">Category</TableHead>
                <TableHead className="text-xs font-semibold cursor-pointer" onClick={() => handleSort('priority')}>
                  <span className="flex items-center gap-1">Severity <ArrowUpDown className="w-3 h-3" /></span>
                </TableHead>
                <TableHead className="text-xs font-semibold">Sentiment</TableHead>
                <TableHead className="text-xs font-semibold">Assigned To</TableHead>
                <TableHead className="text-xs font-semibold cursor-pointer" onClick={() => handleSort('sla_hours_remaining')}>
                  <span className="flex items-center gap-1">SLA <ArrowUpDown className="w-3 h-3" /></span>
                </TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold cursor-pointer" onClick={() => handleSort('created_at')}>
                  <span className="flex items-center gap-1">Created <ArrowUpDown className="w-3 h-3" /></span>
                </TableHead>
                <TableHead className="text-xs font-semibold w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((complaint) => (
                <TableRow key={complaint.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/complaint/${complaint.id}`)}>
                  <TableCell className="text-xs font-mono font-medium text-primary">{complaint.ticket_id}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium text-foreground">{complaint.customer_name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">{complaint.subject}</p>
                    </div>
                  </TableCell>
                  <TableCell><ChannelIcon channel={complaint.channel} /></TableCell>
                  <TableCell><CategoryBadge category={complaint.category} /></TableCell>
                  <TableCell><SeverityBadge severity={complaint.priority} /></TableCell>
                  <TableCell><SentimentBadge sentiment={complaint.sentiment} /></TableCell>
                  <TableCell>
                    {complaint.assigned_agent_name ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">
                            {complaint.assigned_agent_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-foreground">{complaint.assigned_agent_name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell><SLABadge status={complaint.sla_status} hoursRemaining={complaint.sla_hours_remaining} /></TableCell>
                  <TableCell><StatusBadge status={complaint.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(complaint.created_at), 'dd MMM, HH:mm')}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); navigate(`/complaint/${complaint.id}`); }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppShell>
  );
}

function priorityOrder(p: string): number {
  return { critical: 4, high: 3, medium: 2, low: 1 }[p] || 0;
}
