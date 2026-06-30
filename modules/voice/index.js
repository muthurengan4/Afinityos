import { makeModuleHandler, makeNoopListener } from '@/lib/module-utils';

export const manifest = {
  id: 'voice', name: 'Voice', version: '1.0.0',
  description: 'Voice & AI calls — recording, transcript, sentiment, summary.',
  icon: 'Phone', category: 'business',
  navigation: [{ label: 'Voice', href: '/voice', icon: 'Phone', group: 'business' }],
  permissions: ['voice:view','calls:view','calls:record','calls:transcribe'],
  routes: [
    { method: 'GET', path: '/voice/calls', permission: 'calls:view', description: 'List voice + AI calls' },
    { method: 'POST', path: '/voice/calls', permission: 'calls:record', description: 'Record call — emits voice_call.completed' },
    { method: 'GET', path: '/voice/calls/:id', permission: 'calls:view', description: 'Get call by id with transcript' },
  ],
  events: { emits: ['voice_call.completed'], listens: ['customer.created'] },
  apiHooks: { transcribe: 'Stub: Whisper/Deepgram.', summarize: 'Stub: LLM summary.', sentiment: 'Stub: sentiment scoring.' },
};
export const services = { listCalls: 'list-calls', recordCall: 'record-call', transcribeCall: 'transcribe-call (future)' };
export const handler = makeModuleHandler({ resource: 'calls', collection: 'voice_calls', emitOnCreate: 'voice_call.completed' });
export const listeners = {
  'customer.created': makeNoopListener({ moduleId: 'voice', eventType: 'customer.created', note: 'Voice observed new customer; future: provision AI agent + phone number.' }),
};
