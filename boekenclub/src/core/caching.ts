import type { Next } from 'koa';
import type { KoaContext } from '../types/koa';
import { getLogger } from './logging';
import config from 'config';
import NodeCache from 'node-cache';

const CACHE_TTL = config.get<number>('cache.ttl');
const cache = new NodeCache({ stdTTL: CACHE_TTL });

export const serveFromCache = async (
  ctx: KoaContext,
  next: Next,
): Promise<void> => {
  const getReaderInformation = () => {
    const reader = ctx.state.session?.readerId || 'X';
    const roles = (ctx.state.session?.roles || ['👤 not logged in'])
      .join(' ')
      .replace('admin', '🔒 admin')
      .replace('reader', '📖 reader')
      .replace('author', '🖊️ author');
    return `${reader} ${roles}`;
  };
  getLogger().info(`\x1b[33m🚹 ${getReaderInformation()}\x1b[0m`);

  const cacheKey = `${ctx.url}:${ctx.state.session?.readerId}`;

  getLogger().info(`\x1b[36mChecking cache for key ${cacheKey}\x1b[0m`);
  const cachedData = cache.get<{ body: any; status: number }>(cacheKey);
  if (cachedData) {
    getLogger().info('\x1b[32mCache hit ✅\x1b[0m');

    getLogger().info(
      `\x1b[35mServing cached data and resetting TTL until ${new Date(
        Date.now() + CACHE_TTL * 1000,
      ).toISOString()}\x1b[0m`,
    );
    cache.ttl(cacheKey, CACHE_TTL);
    ctx.status = cachedData.status;
    ctx.body = cachedData.body;
    return;
  }

  getLogger().info('\x1b[31mCache miss ❌\x1b[0m');

  await next();

  cache.set(cacheKey, { body: ctx.body, status: ctx.status });
  getLogger().info(
    `\x1b[35mServing fresh data and caching it until ${new Date(
      Date.now() + CACHE_TTL * 1000,
    ).toISOString()}\x1b[0m`,
  );
};

export const invalidateCacheKeys = async (
  ctx: KoaContext,
  next: Next,
): Promise<void> => {
  const deleteKeysFromCache = (...patterns: string[]) => {
    cache.keys().forEach((key) => {
      if (patterns.every((pattern) => key.includes(pattern))) {
        cache.del(key);
      }
    });
  };

  const path = ctx.url;
  switch (true) {
    case path.includes('readers') && path.includes('saved'):
      deleteKeysFromCache('readers', 'saved');
      break;
    case path.includes('readers') && path.includes('reviews'):
      deleteKeysFromCache('readers', 'reviews');
      break;
    default:
      deleteKeysFromCache();
      break;
  }

  return next();
};
