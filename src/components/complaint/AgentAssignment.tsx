import { useState } from 'react';
import { useAgents, useUpdateComplaint } from '@/hooks/useComplaints';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Complaint } from '@/types/complaint';

interface AgentAssignmentProps {
  complaint: Complaint;
}

export default function AgentAssignment({ complaint }: AgentAssignmentProps) {
  const { data: agents = [] } = useAgents();
  const updateComplaint = useUpdateComplaint();
  const [selectedAgentId, setSelectedAgentId] = useState<string>(complaint.assigned_to || '');

  const activeAgents = agents.filter(a => a.is_active);
  const currentAgent = agents.find(a => a.id === complaint.assigned_to);

  const handleAssign = () => {
    const agent = agents.find(a => a.id === selectedAgentId);
    if (!agent) return;

    updateComplaint.mutate(
      {
        id: complaint.id,
        assigned_to: agent.id,
        assigned_agent_name: agent.name,
        status: complaint.status === 'new' ? 'assigned' : complaint.status,
        agent_email: agent.email,
      },
      {
        onSuccess: () => toast.success(`Assigned to ${agent.name}`),
        onError: () => toast.error('Failed to assign agent'),
      }
    );
  };

  return (
    <Card className="p-5 border border-border">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Assignment</h3>
      </div>

      {currentAgent && (
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
              {currentAgent.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{currentAgent.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Progress value={(currentAgent.current_load / currentAgent.max_complaints) * 100} className="h-1.5 flex-1" />
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {currentAgent.current_load}/{currentAgent.max_complaints}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
          <SelectTrigger className="text-sm">
            <SelectValue placeholder="Select agent..." />
          </SelectTrigger>
          <SelectContent>
            {activeAgents.map(agent => {
              const loadPct = (agent.current_load / agent.max_complaints) * 100;
              return (
                <SelectItem key={agent.id} value={agent.id}>
                  <div className="flex items-center gap-2 w-full">
                    <span>{agent.name}</span>
                    <span className={`text-[10px] ml-auto ${loadPct >= 80 ? 'text-destructive' : loadPct >= 50 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                      {agent.current_load}/{agent.max_complaints}
                    </span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Button
          size="sm"
          className="w-full"
          disabled={!selectedAgentId || selectedAgentId === complaint.assigned_to || updateComplaint.isPending}
          onClick={handleAssign}
        >
          {updateComplaint.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
          {complaint.assigned_to ? 'Reassign' : 'Assign'} Agent
        </Button>
      </div>
    </Card>
  );
}