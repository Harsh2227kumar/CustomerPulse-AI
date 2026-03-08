import { ComplaintChannel } from '@/types/complaint';
import { Mail, MessageCircle, Phone, Building2, Smartphone, Globe, Code, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: Record<ComplaintChannel, React.ElementType> = {
  email: Mail,
  whatsapp: MessageCircle,
  phone: Phone,
  branch: Building2,
  app: Smartphone,
  web: Globe,
  api: Code,
  manual: PenLine,
};

export default function ChannelIcon({ channel, className }: { channel: ComplaintChannel; className?: string }) {
  const Icon = iconMap[channel];
  return <Icon className={cn('w-4 h-4 text-muted-foreground', className)} />;
}
