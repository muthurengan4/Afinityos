import { gateway } from './gateway';
import { eventBus } from './event-bus';

import * as sales from '@/modules/sales';
import * as marketing from '@/modules/marketing';
import * as support from '@/modules/support';
import * as insurance from '@/modules/insurance';
import * as rewards from '@/modules/rewards';
import * as voice from '@/modules/voice';

console.log('[modules-registry] Starting module registration...');
console.log('[modules-registry] Current gateway modules:', gateway.modules.size);
if (gateway.modules.size === 0) {
  console.log('[modules-registry] Registering modules (gateway is empty)');
  const all = [sales, marketing, support, insurance, rewards, voice];
  console.log('[modules-registry] Modules to register:', all.map(m => m?.manifest?.id || 'UNDEFINED'));
  for (const m of all) {
    console.log('[modules-registry] Registering module:', m?.manifest?.id);
    gateway.register(m.manifest, m.handler);
    for (const [eventType, listenerFn] of Object.entries(m.listeners || {})) {
      console.log('[modules-registry] Registering listener:', m.manifest.id, 'for event:', eventType);
      eventBus.on(eventType, listenerFn, { moduleId: m.manifest.id });
    }
  }
  console.log('[modules-registry] Module registration complete. Total modules:', gateway.modules.size);
  gateway.registerIntegration('email', { vendors: ['SendGrid','Resend','Postmark'], status: 'not_configured' });
  gateway.registerIntegration('sms', { vendors: ['Twilio','MessageBird'], status: 'not_configured' });
  gateway.registerIntegration('payments', { vendors: ['Stripe','PayPal'], status: 'not_configured' });
  gateway.registerIntegration('telephony', { vendors: ['Twilio Voice','Plivo'], status: 'not_configured' });
  gateway.registerIntegration('ai_llm', { vendors: ['OpenAI','Anthropic','Google'], status: 'not_configured' });
  gateway.registerIntegration('transcription', { vendors: ['Whisper','Deepgram'], status: 'not_configured' });
} else {
  console.log('[modules-registry] Modules already registered. Total modules:', gateway.modules.size);
}

export { gateway, eventBus };
