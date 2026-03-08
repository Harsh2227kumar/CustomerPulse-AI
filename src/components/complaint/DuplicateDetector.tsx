import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDetectDuplicates } from '@/hooks/useAIFeatures';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, Loader2, AlertTriangle, Link2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Complaint } from '@/types/complaint';

interface DuplicateDetectorProps {
  complaint: Complaint;
}

const matchTypeConfig = {
  duplicate: { label: 'Duplicate', icon: Copy, className: 'text-destructive bg-destructive/10 border-destructive/20' },
  related: { label: 'Related', icon: Link2, className: 'text-amber-600 bg-amber-50 border-amber-200' },
  pattern: { label: 'Pattern', icon: TrendingUp, className: 'text-primary bg-primary/10 border-primary/20' },
};

export default function DuplicateDetector({ complaint }: DuplicateDetectorProps) {
  const navigate = useNavigate();
  const detectDuplicates = useDetectDuplicates();
  const [hasScanned, setHasScanned] = useState(false);

  const handleScan = () => {
    detectDuplicates.mutate(
      {
        complaint_id: complaint.id,
        subject: complaint.subject,
        body: complaint.body,
        category: complaint.category,
        customer_name: complaint.customer_name,
      },
      {
        onSuccess: () => setHasScanned(true),
      }
    );
  };

  const duplicates = detectDuplicates.data?.duplicates || [];

  return (
    <Card className="p-5 border border-border">
      <div className="flex items-center gap-2 mb-4">
        <Copy className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Duplicate Detection</h3>
        {hasScanned && duplicates.length > 0 && (
          <Badge variant="destructive" className="text-[10px] ml-auto">{duplicates.length} found</Badge>
        )}
      </div>

      {!hasScanned && (
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={handleScan}
          disabled={detectDuplicates.isPending}
        >
          {detectDuplicates.isPending ? (
            <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Scanning...</>
          ) : (
            <><AlertTriangle className="w-3 h-3 mr-1" /> Scan for Duplicates</>
          )}
        </Button>
      )}

      {hasScanned && duplicates.length === 0 && (
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">✅ No duplicates or related complaints found</p>
        </div>
      )}

      {duplicates.length > 0 && (
        <div className="space-y-2.5">
          {duplicates.map((dup) => {
            const config = matchTypeConfig[dup.match_type];
            const Icon = config.icon;
            return (
              <button
                key={dup.complaint_id}
                onClick={() => navigate(`/complaint/${dup.complaint_id}`)}
                className={cn(
                  'w-full text-left p-3 rounded-lg border transition-colors hover:bg-muted/50',
                  'border-border'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', config.className)}>
                    <Icon className="w-3 h-3 mr-0.5" />
                    {config.label}
                  </Badge>
                  <span className="text-xs font-mono text-primary">{dup.ticket_id}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{dup.similarity_score}% match</span>
                </div>
                <p className="text-xs font-medium text-foreground truncate">{dup.subject}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{dup.reason}</p>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}
