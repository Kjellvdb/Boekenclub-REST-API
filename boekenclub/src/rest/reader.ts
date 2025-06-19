import Router from '@koa/router';
import * as readerService from '../service/reader';
import * as reviewService from '../service/review';
import * as loanService from '../service/loan';
import type {
  BoekenclubAppState,
  BoekenclubAppContext,
  KoaContext,
  KoaRouter,
} from '../types/koa';
import type {
  RegisterReaderRequest,
  GetAllReadersResponse,
  GetReaderByIdResponse,
  UpdateReaderRequest,
  UpdateReaderResponse,
  LoginResponse,
  GetReaderRequest,
} from '../types/reader';
import type { ReaderIdAndIsbnParams, ReaderIdParams } from '../types/common';
import type {
  CreateSavedBookRequest,
  CreateSavedResponse,
  GetSavedByReaderIdResponse,
} from '../types/savedbook';
import type {
  CreateReviewRequest,
  CreateReviewResponse,
  GetReviewByReaderIdResponse,
  UpdateReviewRequest,
  UpdateReviewResponse,
} from '../types/review';
import type { GetLoansByReaderIdResponse } from '../types/loan';
import Joi from 'joi';
import validate from '../core/validation';
import {
  requireAuthentication,
  makeRequireRole,
  authDelay,
} from '../core/auth';
import Role from '../core/roles';
import type { Next } from 'koa';
import { serveFromCache, invalidateCacheKeys } from '../core/caching';

/**
 * @swagger
 * tags:
 *   name: Readers
 *   description: Represents a reader in the system
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Readers:
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
 *     ReadersList:
 *       required:
 *         - items
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/Readers"
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     SavedBooks:
 *       type: object
 *       required:
 *         - reader
 *         - book
 *       properties:
 *         reader:
 *           type: object
 *           required:
 *             - id
 *             - name
 *           properties:
 *             id:
 *               type: integer
 *             name:
 *               type: string
 *         book:
 *           type: object
 *           required:
 *             - isbn
 *             - title
 *           properties:
 *             isbn:
 *               type: string
 *               minLength: 13
 *               maxLength: 13
 *             title:
 *               type: string
 *       example:
 *         reader:
 *           id: 123
 *           name: "John Doe"
 *         book:
 *           isbn: "9781234567897"
 *           title: "The Great Gatsby"
 *     SavedBooksList:
 *       required:
 *         - items
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/SavedBooks"
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Reviews:
 *       type: object
 *       required:
 *         - reader
 *         - book
 *         - rating
 *         - content
 *         - date
 *       properties:
 *         reader:
 *           type: object
 *           required:
 *             - id
 *             - name
 *           properties:
 *             id:
 *               type: integer
 *             name:
 *               type: string
 *         book:
 *           type: object
 *           required:
 *             - isbn
 *             - title
 *           properties:
 *             isbn:
 *               type: string
 *               minLength: 13
 *               maxLength: 13
 *             title:
 *               type: string
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         content:
 *           type: string
 *         date:
 *           type: string
 *           format: date-time
 *       example:
 *         reader:
 *           id: 123
 *           name: "John Doe"
 *         book:
 *           isbn: "9781234567897"
 *           title: "The Great Gatsby"
 *         rating: 5
 *         content: "Great book!"
 *         date: "2021-01-01T12:00:00Z"
 *     ReviewsList:
 *       required:
 *         - items
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/Reviews"
 */

const checkReaderId = (
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
      case 'post':
        return ctx.throw(
          403,
          'You are not allowed to create this information',
          {
            code: 'FORBIDDEN',
          },
        );
      case 'put':
        return ctx.throw(403, 'You are not allowed to edit this information', {
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
 * /api/readers:
 *   get:
 *     summary: Get all readers
 *     tags:
 *       - Readers
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of readers
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ReadersList"
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 *       401:
 *         $ref: '#/components/responses/401Unauthorized'
 *       403:
 *         $ref: '#/components/responses/403Forbidden'
 */
const getAllReaders = async (ctx: KoaContext<GetAllReadersResponse>) => {
  ctx.body = { items: await readerService.getAll() };
  ctx.status = 200;
};

getAllReaders.validateScheme = null;

/**
 * @swagger
 * /api/readers/{id}:
 *   get:
 *     summary: Get a single reader
 *     description: Get a single reader by their id or your own information if you use 'me' as the id
 *     tags:
 *      - Readers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/idParam"
 *     responses:
 *       200:
 *         description: The requested reader
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Readers"
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 *       401:
 *         $ref: '#/components/responses/401Unauthorized'
 *       403:
 *         $ref: '#/components/responses/403Forbidden'
 *       404:
 *         $ref: '#/components/responses/404NotFound'
 */
const getReaderById = async (
  ctx: KoaContext<GetReaderByIdResponse, GetReaderRequest>,
) => {
  ctx.body = await readerService.getById(
    ctx.params.id === 'me' ? ctx.state.session.readerId : ctx.params.id,
  );
  ctx.status = 200;
};

getReaderById.validateScheme = {
  params: {
    id: Joi.alternatives().try(
      Joi.number().integer().positive(),
      Joi.string().valid('me'),
    ),
  },
};

/**
 * @swagger
 * /api/readers:
 *   post:
 *     summary: Register a new reader
 *     tags:
 *      - Readers
 *     requestBody:
 *       description: The reader's data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               address:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 12
 *                 maxLength: 128
 *             example:
 *               name: "John Doe"
 *               email: "john.doe@example.com"
 *               address: "123 Main St, Anytown, USA"
 *               password: "password1234"
 *     responses:
 *       201:
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
 */
const registerReader = async (
  ctx: KoaContext<LoginResponse, void, RegisterReaderRequest>,
) => {
  ctx.body = { token: await readerService.register(ctx.request.body) };
  ctx.status = 201;
};

registerReader.validateScheme = {
  body: {
    name: Joi.string().not().empty(),
    email: Joi.string().email().not().empty(),
    address: Joi.string().not().empty(),
    password: Joi.string().min(12).max(128),
  },
};

/**
 * @swagger
 * /api/readers/{id}:
 *   put:
 *     summary: Update an existing reader
 *     tags:
 *      - Readers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/idParam"
 *     requestBody:
 *       description: The reader's data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               address:
 *                 type: string
 *           example:
 *             name: "John Doe"
 *             email: "john.doe@example.com"
 *             address: "123 Main St, Anytown, USA"
 *     responses:
 *       201:
 *         description: The updated reader
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Readers"
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 *       401:
 *         $ref: '#/components/responses/401Unauthorized'
 *       403:
 *         $ref: '#/components/responses/403Forbidden'
 *       404:
 *         $ref: '#/components/responses/404NotFound'
 */
const updateReader = async (
  ctx: KoaContext<UpdateReaderResponse, ReaderIdParams, UpdateReaderRequest>,
) => {
  ctx.body = await readerService.updateById(
    ctx.params.id === 'me' ? ctx.state.session.readerId : ctx.params.id,
    ctx.request.body,
  );
  ctx.status = 200;
};

updateReader.validateScheme = {
  params: {
    id: Joi.alternatives().try(
      Joi.number().integer().positive(),
      Joi.string().valid('me'),
    ),
  },
  body: {
    name: Joi.string().not().empty().optional(),
    email: Joi.string().email().not().empty().optional(),
    address: Joi.string().not().empty().optional(),
  },
};

/**
 * @swagger
 * /api/readers/{id}:
 *   delete:
 *     summary: Delete a reader
 *     tags:
 *      - Readers
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
const deleteReader = async (ctx: KoaContext<void, ReaderIdParams>) => {
  await readerService.deleteById(
    ctx.params.id === 'me' ? ctx.state.session.readerId : ctx.params.id,
  );
  ctx.status = 204;
};

deleteReader.validateScheme = {
  params: {
    id: Joi.alternatives().try(
      Joi.number().integer().positive(),
      Joi.string().valid('me'),
    ),
  },
};

/**
 * @swagger
 * /api/readers/{id}/saved:
 *   get:
 *     summary: Get saved books from a reader
 *     tags:
 *      - Readers
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
 *               $ref: "#/components/schemas/SavedBooksList"
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 *       401:
 *         $ref: '#/components/responses/401Unauthorized'
 *       403:
 *         $ref: '#/components/responses/403Forbidden'
 *       404:
 *         $ref: '#/components/responses/404NotFound'
 */
const getSavedByReaderId = async (
  ctx: KoaContext<GetSavedByReaderIdResponse, ReaderIdParams>,
) => {
  ctx.body = {
    items: await readerService.getSavedByReaderId(
      ctx.params.id === 'me' ? ctx.state.session.readerId : ctx.params.id,
    ),
  };
  ctx.status = 200;
};

getSavedByReaderId.validateScheme = {
  params: {
    id: Joi.alternatives().try(
      Joi.number().integer().positive(),
      Joi.string().valid('me'),
    ),
  },
};

/**
 * @swagger
 * /api/readers/{id}/saved:
 *   post:
 *     summary: Save a book for a reader
 *     tags:
 *      - Readers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/idParam"
 *     requestBody:
 *       description: The book's data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bookIsbn:
 *                 type: string
 *                 minLength: 13
 *                 maxLength: 13
 *             example:
 *               bookIsbn: "9781234567897"
 *     responses:
 *       201:
 *         description: The saved book
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SavedBooks"
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 *       401:
 *         $ref: '#/components/responses/401Unauthorized'
 *       403:
 *         $ref: '#/components/responses/403Forbidden'
 *       404:
 *         $ref: '#/components/responses/404NotFound'
 */
const createSaved = async (
  ctx: KoaContext<CreateSavedResponse, ReaderIdParams, CreateSavedBookRequest>,
) => {
  ctx.body = await readerService.createSaved({
    ...ctx.request.body,
    readerId:
      ctx.params.id === 'me' ? ctx.state.session.readerId : ctx.params.id,
  });
  ctx.status = 201;
};

createSaved.validateScheme = {
  params: {
    id: Joi.alternatives().try(
      Joi.number().integer().positive(),
      Joi.string().valid('me'),
    ),
  },
  body: {
    bookIsbn: Joi.string().length(13),
  },
};

/**
 * @swagger
 * /api/readers/{id}/saved/{isbn}:
 *   delete:
 *     summary: Delete a saved book for a reader
 *     tags:
 *      - Readers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/idParam"
 *       - $ref: "#/components/parameters/isbnParam"
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
const deleteSaved = async (ctx: KoaContext<void, ReaderIdAndIsbnParams>) => {
  await readerService.deleteSavedByReaderIdAndIsbn(
    ctx.params.id === 'me' ? ctx.state.session.readerId : ctx.params.id,
    ctx.params.isbn,
  );
  ctx.status = 204;
};

deleteSaved.validateScheme = {
  params: {
    id: Joi.alternatives().try(
      Joi.number().integer().positive(),
      Joi.string().valid('me'),
    ),
    isbn: Joi.string().length(13),
  },
};

/**
 * @swagger
 * /api/readers/{id}/reviews:
 *   get:
 *     summary: Get reviews from a reader
 *     tags:
 *      - Readers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/idParam"
 *     responses:
 *       200:
 *         description: The requested reviews
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ReviewsList"
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 *       401:
 *         $ref: '#/components/responses/401Unauthorized'
 *       403:
 *         $ref: '#/components/responses/403Forbidden'
 *       404:
 *         $ref: '#/components/responses/404NotFound'
 */
const getReviewsByReaderId = async (
  ctx: KoaContext<GetReviewByReaderIdResponse, ReaderIdParams>,
) => {
  ctx.body = {
    items: await reviewService.getByReaderId(
      ctx.params.id === 'me' ? ctx.state.session.readerId : ctx.params.id,
    ),
  };
  ctx.status = 200;
};

getReviewsByReaderId.validateScheme = {
  params: {
    id: Joi.alternatives().try(
      Joi.number().integer().positive(),
      Joi.string().valid('me'),
    ),
  },
};

/**
 * @swagger
 * /api/readers/{id}/reviews:
 *   post:
 *     summary: Create a review for a reader
 *     tags:
 *      - Readers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/idParam"
 *     requestBody:
 *       description: The review's data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bookIsbn:
 *                 type: string
 *                 minLength: 13
 *                 maxLength: 13
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               content:
 *                 type: string
 *             example:
 *               bookIsbn: "9781234567897"
 *               rating: 5
 *               content: "Great book!"
 *     responses:
 *       201:
 *         description: The created review
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Reviews"
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 *       401:
 *         $ref: '#/components/responses/401Unauthorized'
 *       403:
 *         $ref: '#/components/responses/403Forbidden'
 *       404:
 *         $ref: '#/components/responses/404NotFound'
 */
const createReview = async (
  ctx: KoaContext<CreateReviewResponse, ReaderIdParams, CreateReviewRequest>,
) => {
  ctx.body = await reviewService.create({
    ...ctx.request.body,
    readerId:
      ctx.params.id === 'me' ? ctx.state.session.readerId : ctx.params.id,
  });
  ctx.status = 201;
};

createReview.validateScheme = {
  params: {
    id: Joi.alternatives().try(
      Joi.number().integer().positive(),
      Joi.string().valid('me'),
    ),
  },
  body: {
    bookIsbn: Joi.string().length(13),
    rating: Joi.number().integer().min(1).max(5),
    content: Joi.string().not().empty(),
  },
};

/**
 * @swagger
 * /api/readers/{id}/reviews/{isbn}:
 *   put:
 *     summary: Update a review for a reader
 *     tags:
 *      - Readers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/idParam"
 *       - $ref: "#/components/parameters/isbnParam"
 *     requestBody:
 *       description: The review's data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               content:
 *                 type: string
 *             example:
 *               rating: 4
 *               content: "Good book!"
 *     responses:
 *       200:
 *         description: The updated review
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Reviews"
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 *       401:
 *         $ref: '#/components/responses/401Unauthorized'
 *       403:
 *         $ref: '#/components/responses/403Forbidden'
 *       404:
 *         $ref: '#/components/responses/404NotFound'
 */
const updateReview = async (
  ctx: KoaContext<
    UpdateReviewResponse,
    ReaderIdAndIsbnParams,
    UpdateReviewRequest
  >,
) => {
  ctx.body = await reviewService.updateByReaderIdAndIsbn(
    ctx.params.id === 'me' ? ctx.state.session.readerId : ctx.params.id,
    ctx.params.isbn,
    ctx.request.body,
  );
  ctx.status = 200;
};

updateReview.validateScheme = {
  params: {
    id: Joi.alternatives().try(
      Joi.number().integer().positive(),
      Joi.string().valid('me'),
    ),
    isbn: Joi.string().length(13),
  },
  body: {
    rating: Joi.number().integer().min(1).max(5).optional(),
    content: Joi.string().not().empty().optional(),
  },
};

/**
 * @swagger
 * /api/readers/{id}/reviews/{isbn}:
 *   delete:
 *     summary: Delete a review for a reader
 *     tags:
 *      - Readers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/idParam"
 *       - $ref: "#/components/parameters/isbnParam"
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
const deleteReview = async (ctx: KoaContext<void, ReaderIdAndIsbnParams>) => {
  await reviewService.deleteByReaderIdAndIsbn(
    ctx.params.id === 'me' ? ctx.state.session.readerId : ctx.params.id,
    ctx.params.isbn,
  );
  ctx.status = 204;
};

deleteReview.validateScheme = {
  params: {
    id: Joi.alternatives().try(
      Joi.number().integer().positive(),
      Joi.string().valid('me'),
    ),
    isbn: Joi.string().length(13),
  },
};

/**
 * @swagger
 * /api/readers/{id}/loans:
 *   get:
 *     summary: Get loans from a reader
 *     tags:
 *      - Readers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/idParam"
 *     responses:
 *       200:
 *         description: The requested loans
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/LoansList"
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 *       403:
 *         $ref: '#/components/responses/403Forbidden'
 *       404:
 *         $ref: '#/components/responses/404NotFound'
 */
const getLoansByReaderId = async (
  ctx: KoaContext<GetLoansByReaderIdResponse, ReaderIdParams>,
) => {
  ctx.body = {
    items: await loanService.getByReaderId(
      ctx.params.id === 'me' ? ctx.state.session.readerId : ctx.params.id,
    ),
  };
  ctx.status = 200;
};

getLoansByReaderId.validateScheme = {
  params: {
    id: Joi.alternatives().try(
      Joi.number().integer().positive(),
      Joi.string().valid('me'),
    ),
  },
};

export default (parent: KoaRouter) => {
  const router = new Router<BoekenclubAppState, BoekenclubAppContext>({
    prefix: '/readers',
  });

  const requireAdmin = makeRequireRole(Role.ADMIN);

  router.get(
    '/',
    requireAuthentication,
    requireAdmin,
    validate(getAllReaders.validateScheme),
    serveFromCache,
    getAllReaders,
  );
  router.get(
    '/:id',
    requireAuthentication,
    validate(getReaderById.validateScheme),
    checkReaderId,
    serveFromCache,
    getReaderById,
  );
  router.post(
    '/',
    authDelay,
    validate(registerReader.validateScheme),
    invalidateCacheKeys,
    registerReader,
  );
  router.put(
    '/:id',
    requireAuthentication,
    validate(updateReader.validateScheme),
    checkReaderId,
    invalidateCacheKeys,
    updateReader,
  );
  router.delete(
    '/:id',
    requireAuthentication,
    validate(deleteReader.validateScheme),
    checkReaderId,
    invalidateCacheKeys,
    deleteReader,
  );

  router.get(
    '/:id/saved',
    requireAuthentication,
    validate(getSavedByReaderId.validateScheme),
    checkReaderId,
    serveFromCache,
    getSavedByReaderId,
  );
  router.post(
    '/:id/saved',
    requireAuthentication,
    validate(createSaved.validateScheme),
    checkReaderId,
    invalidateCacheKeys,
    createSaved,
  );
  router.delete(
    '/:id/saved/:isbn',
    requireAuthentication,
    validate(deleteSaved.validateScheme),
    checkReaderId,
    invalidateCacheKeys,
    deleteSaved,
  );

  router.get(
    '/:id/reviews',
    requireAuthentication,
    validate(getReviewsByReaderId.validateScheme),
    checkReaderId,
    serveFromCache,
    getReviewsByReaderId,
  );
  router.post(
    '/:id/reviews',
    requireAuthentication,
    validate(createReview.validateScheme),
    checkReaderId,
    invalidateCacheKeys,
    createReview,
  );
  router.put(
    '/:id/reviews/:isbn',
    requireAuthentication,
    validate(updateReview.validateScheme),
    checkReaderId,
    invalidateCacheKeys,
    updateReview,
  );
  router.delete(
    '/:id/reviews/:isbn',
    requireAuthentication,
    validate(deleteReview.validateScheme),
    checkReaderId,
    invalidateCacheKeys,
    deleteReview,
  );

  router.get(
    '/:id/loans',
    requireAuthentication,
    validate(getLoansByReaderId.validateScheme),
    checkReaderId,
    serveFromCache,
    getLoansByReaderId,
  );

  parent.use(router.routes()).use(router.allowedMethods());
};
