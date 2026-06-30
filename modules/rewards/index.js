import { makeModuleHandler, makeNoopListener } from '@/lib/module-utils';

export const manifest = {
  id: 'rewards', name: 'Rewards', version: '1.0.0',
  description: 'Loyalty programs, tiers and perks.',
  icon: 'Gift', category: 'business',
  navigation: [{ label: 'Rewards', href: '/rewards', icon: 'Gift', group: 'business' }],
  permissions: ['rewards:view','rewards:issue','rewards:redeem','programs:view'],
  routes: [
    { method: 'GET', path: '/rewards/programs', permission: 'programs:view', description: 'List reward programs' },
    { method: 'POST', path: '/rewards/programs', permission: 'rewards:issue', description: 'Issue reward — emits reward.issued' },
    { method: 'GET', path: '/rewards/programs/:id', permission: 'programs:view', description: 'Get reward by id' },
  ],
  events: { emits: ['reward.issued'], listens: ['customer.created','policy.purchased'] },
  apiHooks: { calculateTier: 'Stub: tier engine.', redeemPoints: 'Stub: redemption catalog.' },
};
export const services = { listPrograms: 'list-programs', issueReward: 'issue-reward' };
export const handler = makeModuleHandler({ resource: 'programs', collection: 'rewards_programs', emitOnCreate: 'reward.issued' });
export const listeners = {
  'customer.created': makeNoopListener({ moduleId: 'rewards', eventType: 'customer.created', note: 'Rewards observed new customer; future: auto-enroll Bronze tier.' }),
  'policy.purchased': makeNoopListener({ moduleId: 'rewards', eventType: 'policy.purchased', note: 'Rewards observed policy purchase; future: award bonus points.' }),
};
