import { makeModuleHandler, makeNoopListener } from '@/lib/module-utils';

export const manifest = {
  id: 'insurance', name: 'Insurance', version: '1.0.0',
  description: 'Policies, claims, underwriting and risk.',
  icon: 'Shield', category: 'business',
  navigation: [{ label: 'Insurance', href: '/insurance', icon: 'Shield', group: 'business' }],
  permissions: ['insurance:view','insurance:edit','policies:view','policies:issue','policies:cancel','claims:view'],
  routes: [
    { method: 'GET', path: '/insurance/policies', permission: 'policies:view', description: 'List policies' },
    { method: 'POST', path: '/insurance/policies', permission: 'policies:issue', description: 'Issue policy — emits policy.purchased' },
    { method: 'GET', path: '/insurance/policies/:id', permission: 'policies:view', description: 'Get policy by id' },
  ],
  events: { emits: ['policy.purchased'], listens: ['customer.created'] },
  apiHooks: { underwrite: 'Stub: AI underwriting model.', rateQuote: 'Stub: rating engine.' },
};
export const services = { listPolicies: 'list-policies', issuePolicy: 'issue-policy' };
export const handler = makeModuleHandler({ resource: 'policies', collection: 'insurance_policies', emitOnCreate: 'policy.purchased' });
export const listeners = {
  'customer.created': makeNoopListener({ moduleId: 'insurance', eventType: 'customer.created', note: 'Insurance observed new customer; future: surface eligible offers.' }),
};
