import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import AppShell from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { CATEGORY_LABELS, CHANNEL_LABELS, PRIORITY_LABELS } from '@/lib/constants';
import { ComplaintCategory, ComplaintChannel, ComplaintPriority } from '@/types/complaint';

const complaintSchema = z.object({
  customer_name: z.string().trim().min(1, 'Customer name is required').max(100, 'Max 100 characters'),
  customer_email: z.string().trim().email('Invalid email').max(255),
  customer_phone: z.string().trim().min(10, 'Min 10 digits').max(15).regex(/^[+\d\s-]+$/, 'Invalid phone number'),
  account_number: z.string().trim().min(1, 'Account number is required').max(20),
  channel: z.enum(['email', 'whatsapp', 'phone', 'branch', 'app', 'web', 'api', 'manual'] as const),
  category: z.enum(['loan', 'account', 'card', 'transfer', 'kyc', 'fraud', 'other'] as const),
  priority: z.enum(['low', 'medium', 'high', 'critical'] as const),
  subject: z.string().trim().min(5, 'Subject must be at least 5 characters').max(200),
  body: z.string().trim().min(20, 'Description must be at least 20 characters').max(5000),
});

type ComplaintFormData = z.infer<typeof complaintSchema>;

export default function NewComplaintPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ComplaintFormData>({
    resolver: zodResolver(complaintSchema),
    defaultValues: {
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      account_number: '',
      channel: 'manual',
      category: 'other',
      priority: 'medium',
      subject: '',
      body: '',
    },
  });

  async function onSubmit(data: ComplaintFormData) {
    setSubmitting(true);
    try {
      // Mock submission for now — will connect to Supabase later
      await new Promise(r => setTimeout(r, 1000));
      toast.success(`Complaint registered for ${data.customer_name}`);
      navigate('/');
    } catch {
      toast.error('Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell title="New Complaint">
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </Button>

        <Card className="p-6 border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-6">Register New Complaint</h2>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Customer Info */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="customer_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name *</FormLabel>
                      <FormControl><Input placeholder="Full name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="customer_email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl><Input type="email" placeholder="customer@email.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="customer_phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone *</FormLabel>
                      <FormControl><Input placeholder="+91-9876543210" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="account_number" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number *</FormLabel>
                      <FormControl><Input placeholder="SB00012345" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Complaint Details */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Complaint Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <FormField control={form.control} name="channel" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Channel</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {Object.entries(CHANNEL_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="priority" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {Object.entries(PRIORITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="subject" render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Subject *</FormLabel>
                    <FormControl><Input placeholder="Brief description of the complaint" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="body" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Complaint Description *</FormLabel>
                    <FormControl><Textarea placeholder="Detailed description of the customer's complaint..." rows={5} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => navigate('/')}>Cancel</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Send className="w-4 h-4 mr-1.5" />
                  Submit Complaint
                </Button>
              </div>
            </form>
          </Form>
        </Card>
      </div>
    </AppShell>
  );
}
