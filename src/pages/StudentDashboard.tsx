import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Loader2, Clock, CalendarDays, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type GatePassRequest = Database['public']['Tables']['gate_pass_requests']['Row'];

const departments = ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Electrical', 'IT', 'MBA', 'Other'];
const years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

export default function StudentDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<GatePassRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    name: '', register_number: '', department: '', year: '',
    reason: '', date: '', time_out: '', return_time: '', parent_contact: '',
  });

  const fetchRequests = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('gate_pass_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setRequests(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel('student-requests')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'gate_pass_requests',
        filter: `user_id=eq.${user?.id}`,
      }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          const updated = payload.new as GatePassRequest;
          setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
          if (updated.status === 'approved') {
            toast.success('Your gate pass has been approved! ✅');
          } else if (updated.status === 'rejected') {
            toast.error('Your gate pass has been rejected ❌');
          }
        } else if (payload.eventType === 'INSERT') {
          setRequests(prev => [payload.new as GatePassRequest, ...prev]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from('gate_pass_requests').insert({
      ...form,
      user_id: user.id,
    });
    if (error) {
      toast.error('Failed to submit request');
    } else {
      toast.success('Gate pass request submitted!');
      setOpen(false);
      setForm({ name: '', register_number: '', department: '', year: '', reason: '', date: '', time_out: '', return_time: '', parent_contact: '' });
    }
    setSubmitting(false);
  };

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="font-display text-2xl font-bold">My Gate Passes</h2>
          <p className="text-muted-foreground text-sm mt-1">Submit and track your gate pass requests</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="glow-primary">
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-border/50 max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">Request Gate Pass</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-secondary/50" />
                </div>
                <div className="space-y-2">
                  <Label>Register Number</Label>
                  <Input required value={form.register_number} onChange={e => setForm(f => ({ ...f, register_number: e.target.value }))} className="bg-secondary/50" />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={form.department} onValueChange={v => setForm(f => ({ ...f, department: v }))}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Select value={form.year} onValueChange={v => setForm(f => ({ ...f, year: v }))}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="bg-secondary/50" />
                </div>
                <div className="space-y-2">
                  <Label>Parent Contact</Label>
                  <Input required value={form.parent_contact} onChange={e => setForm(f => ({ ...f, parent_contact: e.target.value }))} placeholder="+91..." className="bg-secondary/50" />
                </div>
                <div className="space-y-2">
                  <Label>Time Out</Label>
                  <Input type="time" required value={form.time_out} onChange={e => setForm(f => ({ ...f, time_out: e.target.value }))} className="bg-secondary/50" />
                </div>
                <div className="space-y-2">
                  <Label>Return Time</Label>
                  <Input type="time" required value={form.return_time} onChange={e => setForm(f => ({ ...f, return_time: e.target.value }))} className="bg-secondary/50" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea required value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} className="bg-secondary/50" placeholder="Reason for leaving campus..." />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit Request
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : requests.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-display text-lg font-semibold mb-2">No Requests Yet</h3>
          <p className="text-muted-foreground text-sm">Click "New Request" to create your first gate pass.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map(req => (
            <div key={req.id} className="glass-card-hover p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-display font-semibold truncate">{req.reason}</h3>
                    <StatusBadge status={req.status} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {new Date(req.date).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {req.time_out} — {req.return_time}
                    </span>
                    <span>{req.department} • {req.year}</span>
                  </div>
                </div>
              </div>
              {req.admin_message && (
                <div className="mt-3 p-3 rounded-lg bg-secondary/50 border border-border/50 text-sm">
                  <div className="flex items-center gap-1.5 text-primary text-xs font-medium mb-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Admin Remarks
                  </div>
                  <p className="text-muted-foreground">{req.admin_message}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
