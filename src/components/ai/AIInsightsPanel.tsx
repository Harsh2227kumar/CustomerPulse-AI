import { useState } from 'react';
import { useAIInsights } from '@/hooks/useAIFeatures';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, Loader2, TrendingUp, AlertTriangle, Lightbulb, Target, Users, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const severityConfig = {
  info: { icon: Info, className: 'text-primary bg-primary/10 border-primary/20' },
  warning: { icon: AlertTriangle, className: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800' },
  critical: { icon: AlertTriangle, className: 'text-destructive bg-destructive/10 border-destructive/20' },
};

const impactColors = {
  high: 'bg-severity-critical text-white',
  medium: 'bg-severity-medium text-white',
  low: 'bg-severity-low text-white',
};

export default function AIInsightsPanel() {
  const insights = useAIInsights();

  const handleGenerate = () => {
    insights.mutate(undefined, {
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to generate insights'),
    });
  };

  const data = insights.data?.insights;

  return (
    <div className="space-y-6">
      {/* Generate Button */}
      {!data && (
        <Card className="p-8 border border-border text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/5 mx-auto mb-4">
            <Brain className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-2">AI-Powered Insights</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Analyze all complaint data using Gen-AI to identify trends, root causes, and get actionable recommendations.
          </p>
          <Button onClick={handleGenerate} disabled={insights.isPending} size="lg">
            {insights.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing complaint data...</>
            ) : (
              <><Brain className="w-4 h-4 mr-2" /> Generate AI Insights</>
            )}
          </Button>
        </Card>
      )}

      {data && (
        <>
          {/* Executive Summary */}
          <Card className="p-5 border border-border bg-primary/[0.02]">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Executive Summary</h3>
              <Button variant="ghost" size="sm" className="ml-auto text-xs" onClick={handleGenerate} disabled={insights.isPending}>
                {insights.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Refresh'}
              </Button>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{data.executive_summary}</p>
          </Card>

          {/* Risk Alerts */}
          {data.risk_alerts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" /> Risk Alerts
              </h3>
              {data.risk_alerts.map((alert, i) => {
                const config = severityConfig[alert.severity];
                const Icon = config.icon;
                return (
                  <Card key={i} className={cn('p-4 border', config.className)}>
                    <div className="flex items-start gap-2">
                      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{alert.alert}</p>
                        <p className="text-xs mt-1 opacity-80">{alert.details}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Trends */}
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" /> Emerging Trends
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.trends.map((trend, i) => {
                const config = severityConfig[trend.severity];
                return (
                  <Card key={i} className="p-4 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={cn('text-[10px]', config.className)}>
                        {trend.severity}
                      </Badge>
                      <span className="text-xs font-mono text-muted-foreground">{trend.metric}</span>
                    </div>
                    <h4 className="text-sm font-medium text-foreground mb-1">{trend.title}</h4>
                    <p className="text-xs text-muted-foreground">{trend.description}</p>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Root Causes */}
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-primary" /> Root Cause Analysis
            </h3>
            <Card className="border border-border overflow-hidden">
              <div className="divide-y divide-border">
                {data.root_causes.map((rc, i) => (
                  <div key={i} className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">{rc.issue}</span>
                      <Badge variant="secondary" className="text-[10px]">{rc.affected_count} affected</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2"><strong>Cause:</strong> {rc.cause}</p>
                    <p className="text-xs text-primary">💡 {rc.recommendation}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Recommendations */}
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-primary" /> Recommendations
            </h3>
            <div className="space-y-2">
              {data.recommendations.map((rec, i) => (
                <Card key={i} className="p-4 border border-border">
                  <div className="flex items-start gap-3">
                    <span className="text-lg font-bold text-muted-foreground/30 leading-none">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-foreground">{rec.action}</span>
                        <Badge className={cn('text-[9px]', impactColors[rec.impact])}>{rec.impact} impact</Badge>
                        <Badge variant="outline" className="text-[9px]">{rec.effort} effort</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{rec.rationale}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Workload Suggestions */}
          <Card className="p-4 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Workload Optimization</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{data.workload_suggestions}</p>
          </Card>
        </>
      )}
    </div>
  );
}
