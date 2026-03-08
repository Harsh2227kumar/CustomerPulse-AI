import { useState } from 'react';
import { useGenerateResponse } from '@/hooks/useAIFeatures';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Copy, Check, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Complaint } from '@/types/complaint';

const TONES = [
  { value: 'formal' as const, label: 'Formal', description: 'Professional & direct', icon: '🏛️' },
  { value: 'empathetic' as const, label: 'Empathetic', description: 'Warm & understanding', icon: '💛' },
  { value: 'escalation' as const, label: 'Escalation', description: 'Urgent & serious', icon: '⚡' },
];

interface AIResponseGeneratorProps {
  complaint: Complaint;
}

export default function AIResponseGenerator({ complaint }: AIResponseGeneratorProps) {
  const [selectedTone, setSelectedTone] = useState<'formal' | 'empathetic' | 'escalation'>('empathetic');
  const [generatedResponse, setGeneratedResponse] = useState('');
  const [keyActions, setKeyActions] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const generateResponse = useGenerateResponse();

  const handleGenerate = () => {
    generateResponse.mutate(
      {
        complaint_id: complaint.id,
        subject: complaint.subject,
        body: complaint.body,
        category: complaint.category,
        customer_name: complaint.customer_name,
        tone: selectedTone,
      },
      {
        onSuccess: (data) => {
          setGeneratedResponse(data.response_text);
          setKeyActions(data.key_actions);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Failed to generate response');
        },
      }
    );
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedResponse);
    setCopied(true);
    toast.success('Response copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="p-5 border border-border">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">AI Response Generator</h3>
      </div>

      {/* Tone selector */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {TONES.map((tone) => (
          <button
            key={tone.value}
            onClick={() => setSelectedTone(tone.value)}
            className={cn(
              'flex flex-col items-center gap-1 p-3 rounded-lg border text-center transition-all',
              selectedTone === tone.value
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border hover:border-primary/30 hover:bg-muted/50'
            )}
          >
            <span className="text-lg">{tone.icon}</span>
            <span className="text-xs font-medium text-foreground">{tone.label}</span>
            <span className="text-[10px] text-muted-foreground">{tone.description}</span>
          </button>
        ))}
      </div>

      <Button
        size="sm"
        className="w-full mb-4"
        onClick={handleGenerate}
        disabled={generateResponse.isPending}
      >
        {generateResponse.isPending ? (
          <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generating...</>
        ) : (
          <><Sparkles className="w-3 h-3 mr-1" /> Generate {selectedTone} Response</>
        )}
      </Button>

      {generatedResponse && (
        <div className="space-y-3">
          <div className="relative">
            <Textarea
              value={generatedResponse}
              onChange={(e) => setGeneratedResponse(e.target.value)}
              className="min-h-[160px] text-sm pr-10"
            />
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-muted transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
            </button>
          </div>

          {keyActions.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Key Actions</p>
              <div className="flex flex-wrap gap-1.5">
                {keyActions.map((action, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px]">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    {action}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
