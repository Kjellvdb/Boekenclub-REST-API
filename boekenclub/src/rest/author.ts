import Router from '@koa/router';
import * as authorService from '../service/author';
import * as bookService from '../service/book';
import type {
  BoekenclubAppState,
  BoekenclubAppContext,
  KoaContext,
  KoaRouter,
} from '../types/koa';
import type {
  CreateAuthorRequest,
  CreateAuthorResponse,
  GetAllAuthorsResponse,
  GetAuthorByIdResponse,
} from '../types/author';
import type { GetBooksByAuthorIdResponse } from '../types/book';
import Joi from 'joi';
import validate from '../core/validation';
import Role from '../core/roles';
import type { Next } from 'koa';
import type { GetReaderRequest } from '../types/reader';
import { makeRequireRole, requireAuthentication } from '../core/auth';
import type { ReaderIdParams } from '../types/common';
import { serveFromCache, invalidateCacheKeys } from '../core/caching';

/**
 * @swagger
 * tags:
 *   name: Authors
 *   description: Represents an author in the system
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Authors:
 *       allOf:
 *         - $ref: "#/components/schemas/Id"
 *         - type: object
 *           required:
 *             - name
 *             - email
 *             - address
 *           properties:
 *             name:
 *               type: "string"
 *             email:
 *               type: "string"
 *               format: email
 *             address:
 *               type: "string"
 *           example:
 *             id: 123
 *             name: "John Doe"
 *             email: "john.doe@example.com"
 *             address: "123 Main St, Anytown, USA"
 *     AuthorsList:
 *       required:
 *         - items
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/Authors"
 */

const checkPermissions = (
  ctx: KoaContext<unknown, GetReaderRequest>,
  next: Next,
) => {
  const { readerId, roles } = ctx.state.session;
  const { id } = ctx.params;
  const method = ctx.method.toLowerCase();

  if (id !== 'me' && id !== readerId && !roles.includes(Role.ADMIN)) {
    switch (method) {
      case 'get':
        return ctx.throw(403, 'You are not allowed to view this information', {
          code: 'FORBIDDEN',
        });
      case 'delete':
        return ctx.throw(
          403,
          'You are not allowed to delete this information',
          { code: 'FORBIDDEN' },
        );
    }
  }
  return next();
};

/**
 * @swagger
 * /api/authors:
 *   get:
 *     summary: Get all authors
 *     tags:
 *       - Authors
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of authors
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AuthorsList"
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 *       401:
 *         $ref: '#/components/responses/401Unauthorized'
 *       403:
 *         $ref: '#/components/responses/403Forbidden'
 */
const getAllAuthors = async (ctx: KoaContext<GetAllAuthorsResponse>) => {
  ctx.body = { items: await authorService.getAll() };
  ctx.status = 200;
};

getAllAuthors.validateScheme = null;

/**
 * @swagger
 * /api/authors/{id}:
 *   get:
 *     summary: Get a single author
 *     description: Get a single author by their id or your own information if you use 'me' as the id
 *     tags:
 *      - Authors
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/idParam"
 *     responses:
 *       200:
 *         description: The requested author
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Authors"
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 *       401:
 *         $ref: '#/components/responses/401Unauthorized'
 *       403:
 *         $ref: '#/components/responses/403Forbidden'
 *       404:
 *         $ref: '#/components/responses/404NotFound'
 */
const getAuthorById = async (
  ctx: KoaContext<GetAuthorByIdResponse, ReaderIdParams>,
) => {
  ctx.body = await authorService.getById(
    ctx.params.id === 'me' ? ctx.state.session.readerId : ctx.params.id,
  );
  ctx.status = 200;
};

getAuthorById.validateScheme = {
  params: {
    id: Joi.alternatives(
      Joi.number().integer().positive(),
      Joi.string().valid('me'),
    ),
  },
};

/**
 * @swagger
 * /api/authors:
 *   post:
 *     summary: Create a new author
 *     tags:
 *      - Authors
 *     security:
 *      - bearerAuth: []
 *     requestBody:
 *       description: The author's readerId
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               readerId:
 *                 type: integer
 *                 format: int32
 *             example:
 *               readerId: 123
 *     responses:
 *       201:
 *         description: The created author
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Authors"
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 *       401:
 *         $ref: '#/components/responses/401Unauthorized'
 *       403:
 *         $ref: '#/components/responses/403Forbidden'
 *       404:
 *         $ref: '#/components/responses/404NotFound'
 */
const createAuthor = async (
  ctx: KoaContext<CreateAuthorResponse, void, CreateAuthorRequest>,
) => {
  ctx.body = await authorService.create(ctx.request.body.readerId);
  ctx.status = 201;
};

createAuthor.validateScheme = {
  body: {
    readerId: Joi.number().integer().positive(),
  },
};

/**
 * @swagger
 * /api/authors/{id}:
 *   delete:
 *     summary: Delete an author
 *     tags:
 *      - Authors
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/idParam"
 *     responses:
 *       204:
 *         description: No response, the delete was successful
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 *       401:
 *         $ref: '#/components/responses/401Unauthorized'
 *       403:
 *         $ref: '#/components/responses/403Forbidden'
 *       404:
 *         $ref: '#/components/responses/404NotFound'
 */
const deleteAuthor = async (ctx: KoaContext<void, ReaderIdParams>) => {
  await authorService.deleteById(
    ctx.params.id === 'me' ? ctx.state.session.readerId : ctx.params.id,
  );
  ctx.status = 204;
};

deleteAuthor.validateScheme = {
  params: {
    id: Joi.alternatives(
      Joi.number().integer().positive(),
      Joi.string().valid('me'),
    ),
  },
};

/**
 * @swagger
 * /api/authors/{id}/books:
 *   get:
 *     summary: Get books of an author
 *     tags:
 *      - Authors
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/idParam"
 *     responses:
 *       200:
 *         description: The requested books
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/BooksList"
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 *       401:
 *         $ref: '#/components/responses/401Unauthorized'
 *       403:
 *         $ref: '#/components/responses/403Forbidden'
 *       404:
 *         $ref: '#/components/responses/404NotFound'
 */
const getBooksByAuthorId = async (
  ctx: KoaContext<GetBooksByAuthorIdResponse, ReaderIdParams>,
) => {
  ctx.body = {
    items: await bookService.getBooksByAuthorId(
      ctx.params.id === 'me' ? ctx.state.session.readerId : ctx.params.id,
    ),
  };
  ctx.status = 200;
};

getBooksByAuthorId.validateScheme = {
  params: {
    id: Joi.alternatives(
      Joi.number().integer().positive(),
      Joi.string().valid('me'),
    ),
  },
};

export default (parent: KoaRouter) => {
  const router = new Router<BoekenclubAppState, BoekenclubAppContext>({
    prefix: '/authors',
  });

  router.use(requireAuthentication);

  const requireAdmin = makeRequireRole(Role.ADMIN);

  router.get(
    '/',
    requireAdmin,
    validate(getAllAuthors.validateScheme),
    serveFromCache,
    getAllAuthors,
  );
  router.get(
    '/:id',
    validate(getAuthorById.validateScheme),
    checkPermissions,
    serveFromCache,
    getAuthorById,
  );
  router.post(
    '/',
    requireAdmin,
    validate(createAuthor.validateScheme),
    invalidateCacheKeys,
    createAuthor,
  );
  router.delete(
    '/:id',
    validate(deleteAuthor.validateScheme),
    checkPermissions,
    invalidateCacheKeys,
    deleteAuthor,
  );

  router.get(
    '/:id/books',
    validate(getBooksByAuthorId.validateScheme),
    checkPermissions,
    serveFromCache,
    getBooksByAuthorId,
  );

  parent.use(router.routes()).use(router.allowedMethods());
};
