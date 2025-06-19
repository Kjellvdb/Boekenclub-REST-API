import Router from '@koa/router';
import * as healthService from '../service/health';
import validate from '../core/validation';
import type {
  BoekenclubAppContext,
  BoekenclubAppState,
  KoaContext,
  KoaRouter,
} from '../types/koa';
import type { PingResponse, VersionResponse } from '../types/health';

/**
 * @swagger
 * tags:
 *   name: Health
 *   description: Health check endpoints
 */

/**
 * @swagger
 * /api/health/ping:
 *   get:
 *     summary: Ping the server
 *     tags:
 *      - Health
 *     responses:
 *       200:
 *         description: Server pongs back
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - pong
 *               properties:
 *                 pong:
 *                   type: boolean
 */
const ping = async (ctx: KoaContext<PingResponse>) => {
  ctx.status = 200;
  ctx.body = healthService.ping();
};

ping.validateScheme = null;

/**
 * @swagger
 * /api/health/version:
 *   get:
 *     summary: Get the server's version information
 *     tags:
 *      - Health
 *     responses:
 *       200:
 *         description: The server's running version information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - env
 *                 - version
 *                 - name
 *               properties:
 *                 env:
 *                   type: string
 *                 version:
 *                   type: string
 *                 name:
 *                   type: string
 */
const getVersion = async (ctx: KoaContext<VersionResponse>) => {
  ctx.status = 200;
  ctx.body = healthService.getVersion();
};

getVersion.validateScheme = null;

export default (parent: KoaRouter) => {
  const router = new Router<BoekenclubAppState, BoekenclubAppContext>({
    prefix: '/health',
  });

  router.get('/ping', validate(ping.validateScheme), ping);
  router.get('/version', validate(getVersion.validateScheme), getVersion);

  parent.use(router.routes()).use(router.allowedMethods());
};
