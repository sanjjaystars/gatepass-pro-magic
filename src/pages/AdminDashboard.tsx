import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Search, CheckCircle2, XCircle, Eye, ClipboardList, Users, Clock } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type GatePassRequest = Database['public']['Tables']['gate_pass_requests']['Row'];
type RequestStatus = Database['public']['Enums']['request_status'];

export default function AdminDashboard() {
  const [requests, setRequests] = useState<GatePassRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<GatePassRequest | null>(null);
  const [adminMessage, setAdminMessage] = useState('');
  const [acting, setActing] = useState(false);

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [search, setSearch] = useState('');

  const fetchRequests = async () => {
    const { data } = await supabase
      .from('gate_pass_requests')
      .select('*')
      .order('created_at', { ascending: false });
    setRequests(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel('admin-requests')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'gate_pass_requests',
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setRequests(prev => [payload.new as GatePassRequest, ...prev]);
          toast.info('New gate pass request received!');
        } else if (payload.eventType === 'UPDATE') {
          setRequests(prev => prev.map(r => r.id === (payload.new as GatePassRequest).id ? payload.new as GatePassRequest : r));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleAction = async (status: RequestStatus) => {
    if (!selected) return;
    setActing(true);
    const { error } = await supabase
      .from('gate_pass_requests')
      .update({ status, admin_message: adminMessage || null })
      .eq('id', selected.id);
    if (error) {
      toast.error('Failed to update request');
    } else {
      toast.success(`Request ${status}!`);
      setSelected(null);
      setAdminMessage('');
    }
    setActing(false);
  };

  const filtered = requests.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterDept !== 'all' && r.department !== filterDept) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.name.toLowerCase().includes(q) || r.register_number.toLowerCase().includes(q) || r.reason.toLowerCase().includes(q);
    }
    return true;
  });

  const departments = [...new Set(requests.map(r => r.department))];
  const counts = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  return (
    <AppLayout>
      <div className="mb-8">
        <h2 className="font-display text-2xl font-bold">Admin Dashboard</h2>
        <p className="text-muted-foreground text-sm mt-1">Manage all gate pass requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total', value: counts.total, icon: ClipboardList, color: 'text-foreground' },
          { label: 'Pending', value: counts.pending, icon: Clock, color: 'text-warning' },
          { label: 'Approved', value: counts.approved, icon: CheckCircle2, color: 'text-success' },
          { label: 'Rejected', value: counts.rejected, icon: XCircle, color: 'text-destructive' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4">
            <div className="flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <div>
                <p className="text-2xl font-display font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, reg no, or reason..."
              className="pl-9 bg-secondary/50"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-40 bg-secondary/50"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="w-full sm:w-44 bg-secondary/50"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-display text-lg font-semibold mb-2">No Requests Found</h3>
          <p className="text-muted-foreground text-sm">Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left p-4 text-muted-foreground font-medium">Student</th>
                  <th className="text-left p-4 text-muted-foreground font-medium hidden md:table-cell">Department</th>
                  <th className="text-left p-4 text-muted-foreground font-medium hidden lg:table-cell">Date</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(req => (
                  <tr key={req.id} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                    <td className="p-4">
                      <p className="font-medium">{req.name}</p>
                      <p className="text-xs text-muted-foreground">{req.register_number}</p>
                    </td>
                    <td className="p-4 hidden md:table-cell text-muted-foreground">{req.department}</td>
                    <td className="p-4 hidden lg:table-cell text-muted-foreground">{new Date(req.date).toLocaleDateString()}</td>
                    <td className="p-4"><StatusBadge status={req.status} /></td>
                    <td className="p-4">
                      <Button variant="ghost" size="sm" onClick={() => { setSelected(req); setAdminMessage(req.admin_message || ''); }}>
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}>
        <DialogContent className="glass-card border-border/50 sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">Request Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ['Name', selected.name],
                    ['Reg. No', selected.register_number],
                    ['Department', selected.department],
                    ['Year', selected.year],
                    ['Date', new Date(selected.date).toLocaleDateString()],
                    ['Time Out', selected.time_out],
                    ['Return', selected.return_time],
                    ['Parent Contact', selected.parent_contact],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-muted-foreground text-xs">{label}</p>
                      <p className="font-medium">{value}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Reason</p>
                  <p className="text-sm bg-secondary/50 p-3 rounded-lg">{selected.reason}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Current Status:</span>
                  <StatusBadge status={selected.status} />
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Admin Remarks</p>
                  <Textarea
                    value={adminMessage}
                    onChange={e => setAdminMessage(e.target.value)}
                    placeholder="Add remarks (optional)..."
                    className="bg-secondary/50"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleAction('approved')}
                    disabled={acting}
                    className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                  >
                    {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4 mr-2" />Approve</>}
                  </Button>
                  <Button
                    onClick={() => handleAction('rejected')}
                    disabled={acting}
                    variant="destructive"
                    className="flex-1"
                  >
                    {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><XCircle className="h-4 w-4 mr-2" />Reject</>}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
