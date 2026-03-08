import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconClassName?: string;
}

export default function KPICard({ title, value, change, changeType = 'neutral', icon: Icon, iconClassName }: KPICardProps) {
  return (
    <Card className="p-5 bg-card border border-border shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-card-foreground">{value}</p>
          {change && (
            <p className={cn(
              'text-xs font-medium',
              changeType === 'positive' && 'text-severity-low',
              changeType === 'negative' && 'text-severity-critical',
              changeType === 'neutral' && 'text-muted-foreground'
            )}>
              {change}
            </p>
          )}
        </div>
        <div className={cn('flex items-center justify-center w-10 h-10 rounded-lg', iconClassName || 'bg-primary/10')}>
          <Icon className={cn('w-5 h-5', iconClassName ? 'text-current' : 'text-primary')} />
        </div>
      </div>
    </Card>
  );
}
