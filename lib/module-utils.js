import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { clean } from './db';

export function makeNoopListener({ moduleId, eventType, note }) {
  return async function listener(event, deps) {
    await deps.db.collection('event_listener_log').insertOne({
      id: uuidv4(), moduleId, eventType, eventId: event.id,
      organizationId: event.organizationId, result: 'noop',
      note: note || `Module '${moduleId}' observed '${eventType}' — no business logic configured.`,
      timestamp: new Date().toISOString(),
    });
    return { result: 'noop', note };
  };
}

function singularize(word) {
  // Handle common irregular plurals
  const irregulars = {
    'policies': 'policy',
    'campaigns': 'campaign',
    'programs': 'program',
    'tickets': 'ticket',
    'calls': 'call',
    'leads': 'lead'
  };
  return irregulars[word] || word.replace(/s$/, '');
}

export function makeModuleHandler({ resource, collection, emitOnCreate }) {
  const singular = singularize(resource);
  return async function handler(subpath, method, request, ctx, deps) {
    const root = `/${resource}`;
    if ((subpath === root || subpath === root + '/') && method === 'GET') {
      const items = await deps.db.collection(collection).find({ organizationId: ctx.user.organizationId }).sort({ createdAt: -1 }).limit(200).toArray();
      return NextResponse.json({ [resource]: items.map(clean), total: items.length });
    }
    if ((subpath === root || subpath === root + '/') && method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const item = { id: uuidv4(), organizationId: ctx.user.organizationId, status: 'created', ...body, createdBy: ctx.user.id, createdByName: ctx.user.name, createdAt: new Date().toISOString() };
      await deps.db.collection(collection).insertOne(item);
      if (emitOnCreate) {
        await deps.eventBus.emit(emitOnCreate, clean(item), { organizationId: ctx.user.organizationId, actor: { id: ctx.user.id, name: ctx.user.name, type: 'user' } }, { db: deps.db });
      }
      return NextResponse.json({ [singular]: clean(item) }, { status: 201 });
    }
    const idMatch = subpath.match(new RegExp(`^/${resource}/([^/]+)$`));
    if (idMatch && method === 'GET') {
      const item = await deps.db.collection(collection).findOne({ id: idMatch[1], organizationId: ctx.user.organizationId });
      if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ [singular]: clean(item) });
    }
    return null;
  };
}
