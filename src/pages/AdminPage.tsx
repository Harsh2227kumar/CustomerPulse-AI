import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAgents, useSlaRules } from '@/hooks/useComplaints';
import AppShell from '@/components/layout/AppShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Pencil, Users, Clock, Tag, Settings } from 'lucide-react';
import { CATEGORY_LABELS, PRIORITY_LABELS } from '@/lib/constants';

// ─── Agents Tab ─────────────────────────────────────────────
function AgentsTab() {
  const { data: agents = [], isLoading } = useAgents();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editAgent, setEditAgent] = useState<any>(null);
  const [form, setForm] = useState({ name: '', email: '', department: '', role: 'agent', max_complaints: '20' });

  const upsert = useMutation({
    mutationFn: async (values: typeof form & { id?: string }) => {
      const payload = {
        name: values.name,
        email: values.email,
        department: values.department || null,
        role: values.role as any,
        max_complaints: parseInt(values.max_complaints) || 20,
      };
      if (values.id) {
        const { error } = await supabase.from('agents').update(payload as any).eq('id', values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('agents').insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast.success(editAgent ? 'Agent updated' : 'Agent created');
      setOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('agents').update({ is_active } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  });

  function resetForm() {
    setForm({ name: '', email: '', department: '', role: 'agent', max_complaints: '20' });
    setEditAgent(null);
  }

  function openEdit(agent: any) {
    setEditAgent(agent);
    setForm({ name: agent.name, email: agent.email, department: agent.department || '', role: agent.role, max_complaints: String(agent.max_complaints) });
    setOpen(true);
  }

  if (isLoading) return <Skeleton className="h-64 rounded-lg" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{agents.length} agents configured</p>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1.5" />Add Agent</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editAgent ? 'Edit Agent' : 'Add Agent'}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="agent@bank.com" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Department</Label>
                  <Input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="Operations" />
                </div>
                <div className="grid gap-2">
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Max Complaints</Label>
                <Input type="number" value={form.max_complaints} onChange={e => setForm({ ...form, max_complaints: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={() => upsert.mutate({ ...form, id: editAgent?.id })} disabled={!form.name || !form.email}>
                {editAgent ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card className="border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs font-semibold">Agent</TableHead>
              <TableHead className="text-xs font-semibold">Email</TableHead>
              <TableHead className="text-xs font-semibold">Department</TableHead>
              <TableHead className="text-xs font-semibold">Role</TableHead>
              <TableHead className="text-xs font-semibold text-center">Load</TableHead>
              <TableHead className="text-xs font-semibold text-center">Active</TableHead>
              <TableHead className="text-xs font-semibold w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No agents yet. Add your first agent.</TableCell></TableRow>
            )}
            {agents.map(agent => (
              <TableRow key={agent.id} className="hover:bg-muted/30">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">
                        {agent.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground">{agent.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{agent.email}</TableCell>
                <TableCell className="text-xs">{agent.department || '-'}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs capitalize">{agent.role}</Badge></TableCell>
                <TableCell className="text-center text-sm">{agent.current_load}/{agent.max_complaints}</TableCell>
                <TableCell className="text-center">
                  <Switch checked={agent.is_active} onCheckedChange={v => toggleActive.mutate({ id: agent.id, is_active: v })} />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(agent)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ─── SLA Rules Tab ──────────────────────────────────────────
function SLARulesTab() {
  const { data: rules = [], isLoading } = useSlaRules();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editRule, setEditRule] = useState<any>(null);
  const [form, setForm] = useState({ name: '', priority: '', category: '', first_response_hours: '4', resolution_hours: '48' });

  const upsert = useMutation({
    mutationFn: async (values: typeof form & { id?: string }) => {
      const payload = {
        name: values.name,
        priority: values.priority || null,
        category: values.category || null,
        first_response_hours: parseInt(values.first_response_hours) || 4,
        resolution_hours: parseInt(values.resolution_hours) || 48,
      };
      if (values.id) {
        const { error } = await supabase.from('sla_rules').update(payload as any).eq('id', values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('sla_rules').insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla_rules'] });
      toast.success(editRule ? 'Rule updated' : 'Rule created');
      setOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('sla_rules').update({ is_active } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sla_rules'] }),
  });

  function resetForm() {
    setForm({ name: '', priority: '', category: '', first_response_hours: '4', resolution_hours: '48' });
    setEditRule(null);
  }

  function openEdit(rule: any) {
    setEditRule(rule);
    setForm({
      name: rule.name,
      priority: rule.priority || '',
      category: rule.category || '',
      first_response_hours: String(rule.first_response_hours),
      resolution_hours: String(rule.resolution_hours),
    });
    setOpen(true);
  }

  if (isLoading) return <Skeleton className="h-64 rounded-lg" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{rules.length} SLA rules configured</p>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1.5" />Add Rule</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editRule ? 'Edit SLA Rule' : 'Add SLA Rule'}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Rule Name</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Critical Fraud SLA" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Priority (optional)</Label>
                  <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      {Object.entries(PRIORITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Category (optional)</Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>First Response (hours)</Label>
                  <Input type="number" value={form.first_response_hours} onChange={e => setForm({ ...form, first_response_hours: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Resolution (hours)</Label>
                  <Input type="number" value={form.resolution_hours} onChange={e => setForm({ ...form, resolution_hours: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={() => upsert.mutate({ ...form, id: editRule?.id })} disabled={!form.name}>
                {editRule ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card className="border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs font-semibold">Rule Name</TableHead>
              <TableHead className="text-xs font-semibold">Priority</TableHead>
              <TableHead className="text-xs font-semibold">Category</TableHead>
              <TableHead className="text-xs font-semibold text-center">1st Response</TableHead>
              <TableHead className="text-xs font-semibold text-center">Resolution</TableHead>
              <TableHead className="text-xs font-semibold text-center">Active</TableHead>
              <TableHead className="text-xs font-semibold w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No SLA rules yet.</TableCell></TableRow>
            )}
            {rules.map((rule: any) => (
              <TableRow key={rule.id} className="hover:bg-muted/30">
                <TableCell className="text-sm font-medium text-foreground">{rule.name}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs capitalize">{rule.priority || 'Any'}</Badge></TableCell>
                <TableCell><Badge variant="outline" className="text-xs capitalize">{rule.category || 'Any'}</Badge></TableCell>
                <TableCell className="text-center text-sm">{rule.first_response_hours}h</TableCell>
                <TableCell className="text-center text-sm">{rule.resolution_hours}h</TableCell>
                <TableCell className="text-center">
                  <Switch checked={rule.is_active} onCheckedChange={v => toggleActive.mutate({ id: rule.id, is_active: v })} />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(rule)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ─── Categories Tab ─────────────────────────────────────────
function CategoriesTab() {
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">System categories are pre-configured. Contact support to add custom categories.</p>
      <Card className="border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs font-semibold">Category</TableHead>
              <TableHead className="text-xs font-semibold">Key</TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <TableRow key={key} className="hover:bg-muted/30">
                <TableCell className="text-sm font-medium text-foreground">{label}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">{key}</TableCell>
                <TableCell><Badge className="bg-primary/10 text-primary border-0 text-xs">Active</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ─── Settings Tab ───────────────────────────────────────────
function SettingsTab() {
  const { user, profile } = useAuth();

  return (
    <div className="space-y-6">
      <Card className="p-6 border border-border">
        <h3 className="text-sm font-semibold text-foreground mb-4">Bank Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground">Bank Name</Label>
            <Input defaultValue="BankComplain AI" placeholder="Your bank name" />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground">RBI License No.</Label>
            <Input placeholder="License number" />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground">Nodal Officer Email</Label>
            <Input type="email" placeholder="nodal@bank.com" />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground">Escalation Email</Label>
            <Input type="email" placeholder="escalation@bank.com" />
          </div>
        </div>
        <Button className="mt-4" size="sm" onClick={() => toast.success('Settings saved (demo)')}>Save Settings</Button>
      </Card>

      <Card className="p-6 border border-border">
        <h3 className="text-sm font-semibold text-foreground mb-4">Your Account</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input value={user?.email || ''} disabled />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input value={profile?.full_name || ''} disabled />
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Main Admin Page ────────────────────────────────────────
export default function AdminPage() {
  return (
    <AppShell title="Admin Panel">
      <Tabs defaultValue="agents" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="agents" className="gap-1.5"><Users className="w-4 h-4" />Agents</TabsTrigger>
          <TabsTrigger value="sla" className="gap-1.5"><Clock className="w-4 h-4" />SLA Rules</TabsTrigger>
          <TabsTrigger value="categories" className="gap-1.5"><Tag className="w-4 h-4" />Categories</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5"><Settings className="w-4 h-4" />Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="agents"><AgentsTab /></TabsContent>
        <TabsContent value="sla"><SLARulesTab /></TabsContent>
        <TabsContent value="categories"><CategoriesTab /></TabsContent>
        <TabsContent value="settings"><SettingsTab /></TabsContent>
      </Tabs>
    </AppShell>
  );
}
