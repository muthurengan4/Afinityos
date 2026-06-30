import { makeModuleHandler, makeNoopListener } from '@/lib/module-utils';

export const manifest = {
  id: 'support', name: 'Support', version: '1.0.0',
  description: 'Omnichannel support — tickets, queues, AI co-pilot.',
  icon: 'LifeBuoy', category: 'business',
  navigation: [{ label: 'Support', href: '/support', icon: 'LifeBuoy', group: 'business' }],
  permissions: ['support:view','support:edit','tickets:view','tickets:create','tickets:assign','tickets:close'],
  routes: [
    { method: 'GET', path: '/support/tickets', permission: 'tickets:view', description: 'List tickets' },
    { method: 'POST', path: '/support/tickets', permission: 'tickets:create', description: 'Open ticket — emits ticket.opened' },
    { method: 'GET', path: '/support/tickets/:id', permission: 'tickets:view', description: 'Get ticket by id' },
  ],
  events: { emits: ['ticket.opened'], listens: ['customer.created'] },
  apiHooks: { routeTicket: 'Stub: skill-based routing.', suggestReply: 'Stub: AI reply suggestions.' },
};
export const services = { listTickets: 'list-tickets', openTicket: 'open-ticket' };
export const handler = makeModuleHandler({ resource: 'tickets', collection: 'support_tickets', emitOnCreate: 'ticket.opened' });
export const listeners = {
  'customer.created': makeNoopListener({ moduleId: 'support', eventType: 'customer.created', note: 'Support observed new customer; future: auto welcome ticket.' }),
};
