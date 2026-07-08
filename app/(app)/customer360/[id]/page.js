'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { CustomerProfileHeader } from '@/components/customer360/customer-profile-header';
import { CustomerStats } from '@/components/customer360/customer-stats';
import { CustomerTimeline } from '@/components/customer360/customer-timeline';
import { CustomerPolicies } from '@/components/customer360/customer-policies';
import { CustomerTickets } from '@/components/customer360/customer-tickets';
import { CustomerCampaigns } from '@/components/customer360/customer-campaigns';
import { CustomerRewards } from '@/components/customer360/customer-rewards';
import { CustomerCalls } from '@/components/customer360/customer-calls';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { authFetch, organization } = useAuth();
  const id = params?.id;
  const [customer, setCustomer] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [rewards, setRewards] = useState(null);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const currency = organization?.currency || 'USD';

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [cRes, tlRes, pRes, tRes, cmRes, rRes, calRes] = await Promise.all([
          authFetch(`/api/customers/${id}`),
          authFetch(`/api/customers/${id}/timeline`),
          authFetch(`/api/customers/${id}/policies`),
          authFetch(`/api/customers/${id}/tickets`),
          authFetch(`/api/customers/${id}/campaigns`),
          authFetch(`/api/customers/${id}/rewards`),
          authFetch(`/api/customers/${id}/calls`),
        ]);
        if (cancelled) return;
        if (!cRes.ok) { toast.error('Customer not found'); router.push('/customer360'); return; }
        const cd = await cRes.json();
        setCustomer(cd.customer);
        setTimeline((await tlRes.json()).timeline || []);
        setPolicies((await pRes.json()).policies || []);
        setTickets((await tRes.json()).tickets || []);
        setCampaigns((await cmRes.json()).campaigns || []);
        setRewards((await rRes.json()).rewards);
        setCalls((await calRes.json()).calls || []);
      } catch (e) {
        toast.error('Failed to load customer');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line
  }, [id]);

  const onDelete = async () => {
    if (!confirm('Delete this customer and all related data? This cannot be undone.')) return;
    try {
      const res = await authFetch(`/api/customers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      toast.success('Customer deleted');
      router.replace('/customer360');
    } catch (e) { toast.error(e.message); }
  };

  if (loading || !customer) {
    return (
      <div className="py-20 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Loading master profile…
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/customer360"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Customer360</Link>
        </Button>
        <Button variant="ghost" size="sm" className="text-rose-500 hover:text-rose-500" onClick={onDelete}>
          <Trash2 className="h-4 w-4 mr-2" /> Delete customer
        </Button>
      </div>

      <CustomerProfileHeader customer={customer} />
      <CustomerStats customer={customer} currency={currency} />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="glass mb-6 flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="tickets">Support</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="calls">Calls</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <CustomerTimeline events={timeline.slice(0, 6)} />
              <CustomerTickets tickets={tickets.slice(0, 3)} />
            </div>
            <div className="space-y-6">
              <CustomerRewards rewards={rewards} />
              <CustomerPolicies policies={policies.slice(0, 2)} currency={currency} />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="timeline"><CustomerTimeline events={timeline} /></TabsContent>
        <TabsContent value="policies"><CustomerPolicies policies={policies} currency={currency} /></TabsContent>
        <TabsContent value="tickets"><CustomerTickets tickets={tickets} /></TabsContent>
        <TabsContent value="campaigns"><CustomerCampaigns campaigns={campaigns} /></TabsContent>
        <TabsContent value="rewards"><CustomerRewards rewards={rewards} /></TabsContent>
        <TabsContent value="calls"><CustomerCalls calls={calls} /></TabsContent>
      </Tabs>
    </div>
  );
}
