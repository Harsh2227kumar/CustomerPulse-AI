import { useState, useMemo } from 'react';
import { useComplaints } from '@/hooks/useComplaints';
import AppShell from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, AlertTriangle, Calendar } from 'lucide-react';
import { format, subDays, isAfter, isBefore } from 'date-fns';
import { CATEGORY_LABELS, STATUS_LABELS, PRIORITY_LABELS } from '@/lib/constants';
import type { Complaint } from '@/types/complaint';

export default function ReportsPage() {
  const { data: complaints = [], isLoading } = useComplaints();
  const [period, setPeriod] = useState('30');

  const filteredComplaints = useMemo(() => {
    const cutoff = subDays(new Date(), parseInt(period));
    return complaints.filter(c => isAfter(new Date(c.created_at), cutoff));
  }, [complaints, period]);

  const slaBreached = useMemo(() =>
    filteredComplaints.filter(c => c.sla_status === 'breached' || (c.sla_deadline && isBefore(new Date(c.sla_deadline), new Date()) && !['resolved', 'closed'].includes(c.status))),
    [filteredComplaints]
  );

  // RBI Annexure stats
  const annexureStats = useMemo(() => {
    const total = filteredComplaints.length;
    const pending = filteredComplaints.filter(c => !['resolved', 'closed'].includes(c.status)).length;
    const resolved = filteredComplaints.filter(c => c.status === 'resolved' || c.status === 'closed').length;

    const byCategory: Record<string, { total: number; pending: number; resolved: number }> = {};
    filteredComplaints.forEach(c => {
      const cat = c.category;
      if (!byCategory[cat]) byCategory[cat] = { total: 0, pending: 0, resolved: 0 };
      byCategory[cat].total++;
      if (['resolved', 'closed'].includes(c.status)) byCategory[cat].resolved++;
      else byCategory[cat].pending++;
    });

    const byChannel: Record<string, number> = {};
    filteredComplaints.forEach(c => { byChannel[c.channel] = (byChannel[c.channel] || 0) + 1; });

    return { total, pending, resolved, byCategory, byChannel };
  }, [filteredComplaints]);

  function exportCSV(data: Complaint[], filename: string) {
    const headers = ['Ticket ID', 'Customer Name', 'Category', 'Priority', 'Status', 'Channel', 'SLA Status', 'Created At', 'Subject'];
    const rows = data.map(c => [
      c.ticket_id, c.customer_name, c.category, c.priority, c.status, c.channel, c.sla_status,
      format(new Date(c.created_at), 'yyyy-MM-dd HH:mm'), `"${c.subject.replace(/"/g, '""')}"`
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csv, `${filename}.csv`, 'text/csv');
  }

  async function exportPDF(data: Complaint[], title: string) {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text(title, 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')} | Period: Last ${period} days`, 14, 28);

    autoTable(doc, {
      startY: 35,
      head: [['Ticket ID', 'Customer', 'Category', 'Priority', 'Status', 'Channel', 'SLA', 'Created']],
      body: data.map(c => [
        c.ticket_id, c.customer_name, CATEGORY_LABELS[c.category] || c.category,
        PRIORITY_LABELS[c.priority] || c.priority, STATUS_LABELS[c.status] || c.status,
        c.channel, c.sla_status.replace('_', ' '),
        format(new Date(c.created_at), 'dd MMM yyyy'),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
  }

  function downloadFile(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) {
    return (
      <AppShell title="Reports">
        <Skeleton className="h-12 w-64 mb-6" />
        <Skeleton className="h-96 rounded-lg" />
      </AppShell>
    );
  }

  return (
    <AppShell title="Reports">
      {/* Period selector */}
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-44 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last 1 year</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filteredComplaints.length} complaints</span>
      </div>

      <Tabs defaultValue="annexure" className="space-y-6">
        <TabsList>
          <TabsTrigger value="annexure"><FileText className="w-4 h-4 mr-1.5" />RBI Annexure</TabsTrigger>
          <TabsTrigger value="sla"><AlertTriangle className="w-4 h-4 mr-1.5" />SLA Breach</TabsTrigger>
        </TabsList>

        {/* RBI Annexure Template */}
        <TabsContent value="annexure" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">RBI Complaint Annexure Report</h2>
              <p className="text-sm text-muted-foreground">Regulatory compliance report as per RBI guidelines</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => exportCSV(filteredComplaints, 'RBI_Annexure_Report')}>
                <Download className="w-4 h-4 mr-1.5" />CSV
              </Button>
              <Button variant="default" size="sm" onClick={() => exportPDF(filteredComplaints, 'RBI Annexure Report')}>
                <Download className="w-4 h-4 mr-1.5" />PDF
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Complaints</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold text-foreground">{annexureStats.total}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold text-severity-high">{annexureStats.pending}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Resolved / Closed</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold text-severity-low">{annexureStats.resolved}</p></CardContent>
            </Card>
          </div>

          {/* Category-wise breakdown */}
          <Card className="border border-border">
            <CardHeader><CardTitle className="text-sm font-semibold">Category-wise Complaint Summary</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs font-semibold">Category</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Total</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Pending</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Resolved</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Resolution %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(annexureStats.byCategory).map(([cat, stats]) => (
                    <TableRow key={cat}>
                      <TableCell className="text-sm font-medium">{CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] || cat}</TableCell>
                      <TableCell className="text-center text-sm">{stats.total}</TableCell>
                      <TableCell className="text-center text-sm">{stats.pending}</TableCell>
                      <TableCell className="text-center text-sm">{stats.resolved}</TableCell>
                      <TableCell className="text-center text-sm font-medium">
                        {stats.total > 0 ? `${Math.round((stats.resolved / stats.total) * 100)}%` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {Object.keys(annexureStats.byCategory).length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No complaints in this period</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Detailed complaint list */}
          <Card className="border border-border">
            <CardHeader><CardTitle className="text-sm font-semibold">Detailed Complaint Register</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs font-semibold">Sr.</TableHead>
                      <TableHead className="text-xs font-semibold">Ticket ID</TableHead>
                      <TableHead className="text-xs font-semibold">Customer</TableHead>
                      <TableHead className="text-xs font-semibold">Category</TableHead>
                      <TableHead className="text-xs font-semibold">Priority</TableHead>
                      <TableHead className="text-xs font-semibold">Channel</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-xs font-semibold">Created</TableHead>
                      <TableHead className="text-xs font-semibold">Resolved</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredComplaints.map((c, i) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-xs">{i + 1}</TableCell>
                        <TableCell className="text-xs font-mono text-primary">{c.ticket_id}</TableCell>
                        <TableCell className="text-xs">{c.customer_name}</TableCell>
                        <TableCell className="text-xs">{CATEGORY_LABELS[c.category] || c.category}</TableCell>
                        <TableCell><Badge variant={c.priority === 'critical' ? 'destructive' : 'secondary'} className="text-[10px]">{c.priority}</Badge></TableCell>
                        <TableCell className="text-xs capitalize">{c.channel}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{STATUS_LABELS[c.status] || c.status}</Badge></TableCell>
                        <TableCell className="text-xs">{format(new Date(c.created_at), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="text-xs">{c.resolved_at ? format(new Date(c.resolved_at), 'dd MMM yyyy') : '-'}</TableCell>
                      </TableRow>
                    ))}
                    {filteredComplaints.length === 0 && (
                      <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No complaints in this period</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SLA Breach Report */}
        <TabsContent value="sla" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">SLA Breach Report</h2>
              <p className="text-sm text-muted-foreground">Complaints that breached or are past their SLA deadline</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => exportCSV(slaBreached, 'SLA_Breach_Report')}>
                <Download className="w-4 h-4 mr-1.5" />CSV
              </Button>
              <Button variant="default" size="sm" onClick={() => exportPDF(slaBreached, 'SLA Breach Report')}>
                <Download className="w-4 h-4 mr-1.5" />PDF
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Breached</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold text-severity-critical">{slaBreached.length}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Breach Rate</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">
                  {filteredComplaints.length > 0 ? `${Math.round((slaBreached.length / filteredComplaints.length) * 100)}%` : '0%'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Most Affected Category</CardTitle></CardHeader>
              <CardContent>
                <p className="text-lg font-bold text-foreground">
                  {slaBreached.length > 0
                    ? CATEGORY_LABELS[getMostCommon(slaBreached.map(c => c.category)) as keyof typeof CATEGORY_LABELS] || 'N/A'
                    : 'None'}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border border-border">
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs font-semibold">Ticket ID</TableHead>
                      <TableHead className="text-xs font-semibold">Customer</TableHead>
                      <TableHead className="text-xs font-semibold">Category</TableHead>
                      <TableHead className="text-xs font-semibold">Priority</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-xs font-semibold">SLA Deadline</TableHead>
                      <TableHead className="text-xs font-semibold">Assigned To</TableHead>
                      <TableHead className="text-xs font-semibold">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slaBreached.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-xs font-mono text-primary">{c.ticket_id}</TableCell>
                        <TableCell className="text-xs">{c.customer_name}</TableCell>
                        <TableCell className="text-xs">{CATEGORY_LABELS[c.category] || c.category}</TableCell>
                        <TableCell><Badge variant="destructive" className="text-[10px]">{c.priority}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{STATUS_LABELS[c.status] || c.status}</Badge></TableCell>
                        <TableCell className="text-xs text-severity-critical font-medium">
                          {c.sla_deadline ? format(new Date(c.sla_deadline), 'dd MMM yyyy, HH:mm') : '-'}
                        </TableCell>
                        <TableCell className="text-xs">{c.assigned_agent_name || 'Unassigned'}</TableCell>
                        <TableCell className="text-xs">{format(new Date(c.created_at), 'dd MMM yyyy')}</TableCell>
                      </TableRow>
                    ))}
                    {slaBreached.length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No SLA breaches in this period 🎉</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function getMostCommon(arr: string[]): string {
  const counts: Record<string, number> = {};
  arr.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
}
