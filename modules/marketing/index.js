import { makeModuleHandler, makeNoopListener } from '@/lib/module-utils';

export const manifest = {
  id: 'marketing', name: 'Marketing', version: '1.0.0',
  description: 'Campaigns, journeys, multi-channel orchestration.',
  icon: 'Megaphone', category: 'business',
  navigation: [{ label: 'Marketing', href: '/marketing', icon: 'Megaphone', group: 'business' }],
  permissions: ['marketing:view','marketing:edit','campaigns:view','campaigns:create','campaigns:send','audiences:view'],
  routes: [
    { method: 'GET', path: '/marketing/campaigns', permission: 'campaigns:view', description: 'List campaigns' },
    { method: 'POST', path: '/marketing/campaigns', permission: 'campaigns:create', description: 'Create campaign — emits campaign.sent' },
    { method: 'GET', path: '/marketing/campaigns/:id', permission: 'campaigns:view', description: 'Get campaign by id' },
  ],
  events: { emits: ['campaign.sent'], listens: ['customer.created'] },
  apiHooks: { sendEmail: 'Stub: SendGrid/Resend.', sendSms: 'Stub: Twilio.', generateCopy: 'Stub: GPT/Claude copy.' },
};
export const services = { listCampaigns: 'list-campaigns', createCampaign: 'create-campaign', sendCampaign: 'send-campaign (future)' };
export const handler = makeModuleHandler({ resource: 'campaigns', collection: 'marketing_campaigns', emitOnCreate: 'campaign.sent' });
export const listeners = {
  'customer.created': makeNoopListener({ moduleId: 'marketing', eventType: 'customer.created', note: 'Marketing observed new customer; future: enroll in welcome journey.' }),
};
