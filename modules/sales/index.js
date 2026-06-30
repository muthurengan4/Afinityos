import { makeModuleHandler, makeNoopListener } from '@/lib/module-utils';

export const manifest = {
  id: 'sales', name: 'Sales', version: '1.0.0',
  description: 'Pipeline, leads, deals and forecasting.',
  icon: 'TrendingUp', category: 'business',
  navigation: [{ label: 'Sales', href: '/sales', icon: 'TrendingUp', group: 'business' }],
  permissions: ['sales:view','sales:edit','leads:view','leads:create','leads:edit','leads:delete','deals:view','deals:edit'],
  routes: [
    { method: 'GET', path: '/sales/leads', permission: 'leads:view', description: 'List leads (org-scoped)' },
    { method: 'POST', path: '/sales/leads', permission: 'leads:create', description: 'Create a lead — emits lead.created' },
    { method: 'GET', path: '/sales/leads/:id', permission: 'leads:view', description: 'Fetch a lead by id' },
  ],
  events: { emits: ['lead.created'], listens: ['customer.created','policy.purchased'] },
  apiHooks: { enrichLead: 'Stub: future Clearbit/Apollo enrichment.', forecastPipeline: 'Stub: future predictive forecast.' },
};
export const services = { listLeads: 'list-leads', createLead: 'create-lead', enrichLead: 'enrich-lead (future)' };
export const handler = makeModuleHandler({ resource: 'leads', collection: 'leads', emitOnCreate: 'lead.created' });
export const listeners = {
  'customer.created': makeNoopListener({ moduleId: 'sales', eventType: 'customer.created', note: 'Sales observed new customer; future: auto-create opportunity + assign owner.' }),
  'policy.purchased': makeNoopListener({ moduleId: 'sales', eventType: 'policy.purchased', note: 'Sales observed policy purchase; future: create cross-sell opportunity.' }),
};
