import type {
  BoekenclubAppContext,
  BoekenclubAppState,
  KoaContext,
  KoaRouter,
} from '../types/koa';
import Router from '@koa/router';
import * as readerService from '../service/reader';
import Joi from 'joi';
import validate from '../core/validation';
import type { LoginRequest, LoginResponse } from '../types/reader';
import { authDelay } from '../core/auth';

/**
 * @swagger
 * tags:
 *   name: Sessions
 *   description: User session management
 *
 * /api/sessions:
 *   post:
 *     summary: Try to login
 *     tags:
 *      - Sessions
 *     requestBody:
 *       description: The credentials of the user to login
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 12
 *                 maxLength: 128
 *           example:
 *             email: "john.doe@example.com"
 *             password: "secretpassword"
 *     responses:
 *       200:
 *         description: A JWT token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 *       401:
 *         $ref: '#/components/responses/401Unauthorized'
 */

const login = async (ctx: KoaContext<LoginResponse, void, LoginRequest>) => {
  const { email, password } = ctx.request.body;
  const token = await readerService.login(email, password);
  ctx.body = { token };
  ctx.status = 200;
};

login.validationScheme = {
  body: {
    email: Joi.string().email(),
    password: Joi.string().min(12).max(128),
  },
};

export default (parent: KoaRouter) => {
  const router = new Router<BoekenclubAppState, BoekenclubAppContext>({
    prefix: '/sessions',
  });

  router.post('/', authDelay, validate(login.validationScheme), login);

  parent.use(router.routes()).use(router.allowedMethods());
};
