const buckets = new Map();

export function rateLimit(key, { max = 120, windowMs = 60_000 } = {}) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now > b.resetAt) b = { count: 0, resetAt: now + windowMs };
  b.count += 1;
  buckets.set(key, b);
  return { allowed: b.count <= max, remaining: Math.max(0, max - b.count), resetAt: b.resetAt, limit: max };
}

export function rateLimitKey(ctx, route) {
  const userPart = ctx.user?.id || ctx.request.headers.get('x-forwarded-for') || 'anonymous';
  return `${userPart}:${route || ctx.path}`;
}
