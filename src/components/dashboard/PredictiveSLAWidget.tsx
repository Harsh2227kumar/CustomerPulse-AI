import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePredictSlaBreach } from '@/hooks/useAIFeatures';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Loader2, AlertTriangle, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const riskColors = {
  low: 'text-severity-low bg-severity-low-bg',
  medium: 'text-severity-medium bg-severity-medium-bg',
  high: 'text-severity-high bg-severity-high-bg',
  critical: 'text-severity-critical bg-severity-critical-bg',
};

const riskProgressColors = {
  low: 'bg-severity-low',
  medium: 'bg-severity-medium',
  high: 'bg-severity-high',
  critical: 'bg-severity-critical',
};

export default function PredictiveSLAWidget() {
  const navigate = useNavigate();
  const predictSla = usePredictSlaBreach();
  const [expanded, setExpanded] = useState(false);

  const handlePredict = () => {
    predictSla.mutate(undefined, {
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to run prediction');
      },
    });
  };

  const predictions = predictSla.data?.predictions || [];
  const summary = predictSla.data?.summary;
  const highRisk = predictions.filter(p => p.breach_probability >= 60);
  const displayed = expanded ? predictions : predictions.slice(0, 5);

  return (
    <Card className="p-5 border border-border">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Predictive SLA Alerts</h3>
        {highRisk.length > 0 && (
          <Badge variant="destructive" className="text-[10px] ml-auto animate-pulse">
            {highRisk.length} at risk
          </Badge>
        )}
      </div>

      {!predictSla.data && (
        <Button
          size="sm"
          className="w-full"
          onClick={handlePredict}
          disabled={predictSla.isPending}
        >
          {predictSla.isPending ? (
            <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Analyzing all open complaints...</>
          ) : (
            <><TrendingUp className="w-3 h-3 mr-1" /> Run SLA Breach Prediction</>
          )}
        </Button>
      )}

      {summary && (
        <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-foreground leading-relaxed">{summary}</p>
        </div>
      )}

      {predictions.length > 0 && (
        <div className="space-y-2.5">
          {displayed.map((pred) => (
            <button
              key={pred.ticket_id}
              onClick={() => pred.complaint_id && navigate(`/complaint/${pred.complaint_id}`)}
              className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono text-primary">{pred.ticket_id}</span>
                <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', riskColors[pred.risk_level])}>
                  {pred.risk_level}
                </Badge>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {pred.sla_hours_remaining?.toFixed(1)}h left
                </span>
              </div>

              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex-1">
                  <Progress
                    value={pred.breach_probability}
                    className="h-1.5"
                  />
                </div>
                <span className={cn(
                  'text-xs font-bold',
                  pred.breach_probability >= 70 ? 'text-severity-critical' :
                  pred.breach_probability >= 40 ? 'text-severity-high' : 'text-severity-low'
                )}>
                  {pred.breach_probability}%
                </span>
              </div>

              {pred.risk_factors.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {pred.risk_factors.slice(0, 3).map((factor, i) => (
                    <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {factor}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-[10px] text-primary font-medium">
                💡 {pred.recommended_action}
              </p>
            </button>
          ))}

          {predictions.length > 5 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            >
              {expanded ? (
                <><ChevronUp className="w-3 h-3 mr-1" /> Show less</>
              ) : (
                <><ChevronDown className="w-3 h-3 mr-1" /> Show {predictions.length - 5} more</>
              )}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={handlePredict}
            disabled={predictSla.isPending}
          >
            {predictSla.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <TrendingUp className="w-3 h-3 mr-1" />}
            Refresh Predictions
          </Button>
        </div>
      )}

      {predictSla.data && predictions.length === 0 && (
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">✅ No open complaints to analyze</p>
        </div>
      )}
    </Card>
  );
}
