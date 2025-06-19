import Router from '@koa/router';
import * as copyService from '../service/copy';
import type { CreateCopyRequest, CreateCopyResponse } from '../types/copy';
import type {
  BoekenclubAppContext,
  BoekenclubAppState,
  KoaContext,
  KoaRouter,
} from '../types/koa';
import type { CopyIdAndIsbnParams, IsbnParams } from '../types/common';
import Joi from 'joi';
import validate from '../core/validation';
import { makeRequireRole, requireAuthentication } from '../core/auth';
import Role from '../core/roles';
import { invalidateCacheKeys } from '../core/caching';

/**
 * @swagger
 * tags:
 *   name: Copies
 *   description: Represents a copy in the system
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Copies:
 *       allOf:
 *         - $ref: "#/components/schemas/SequenceNumber"
 *         - type: object
 *           required:
 *             - book
 *             - library
 *             - condition
 *             - isAvailable
 *           properties:
 *             book:
 *               type: object
 *               properties:
 *                 isbn:
 *                   type: "string"
 *                   minLength: 13
 *                   maxLength: 13
 *                 title:
 *                   type: "string"
 *             library:
 *               type: object
 *               properties:
 *                 id:
 *                   type: "number"
 *                 name:
 *                   type: "string"
 *             condition:
 *               type: "string"
 *             isAvailable:
 *               type: "boolean"
 *           example:
 *             sequenceNumber: 123
 *             book:
 *               isbn: "9789024567897"
 *               title: "Harry Potter en de steen der wijzen"
 *             library:
 *               id: 123
 *               name: "Bibliotheek De Krook"
 *             condition: "Good"
 *             isAvailable: true
 *     CopiesList:
 *       required:
 *         - items
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/Copies"
 */

/**
 * @swagger
 * /api/copies/{isbn}:
 *   post:
 *     summary: Create a new copy
 *     tags:
 *      - Copies
 *     security:
 *      - bearerAuth: []
 *     parameters:
 *      - $ref: "#/components/parameters/isbnParam"
 *     requestBody:
 *       description: The copy's data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               libraryId:
 *                 type: integer
 *               condition:
 *                 type: string
 *             example:
 *               libraryId: 123
 *               condition: "good"
 *     responses:
 *       201:
 *         description: The created copy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Copies"
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 *       401:
 *         $ref: '#/components/responses/401Unauthorized'
 *       403:
 *         $ref: '#/components/responses/403Forbidden'
 */
const createCopy = async (
  ctx: KoaContext<CreateCopyResponse, IsbnParams, CreateCopyRequest>,
) => {
  ctx.body = await copyService.create(ctx.params.isbn, ctx.request.body);
  ctx.status = 201;
};

createCopy.validateScheme = {
  params: {
    isbn: Joi.string().length(13),
  },
  body: {
    libraryId: Joi.number().integer().positive(),
    condition: Joi.string().not().empty(),
  },
};

/**
 * @swagger
 * /api/copies/{isbn}/{sequenceNumber}:
 *   put:
 *     summary: Update an existing copy
 *     tags:
 *      - Copies
 *     security:
 *      - bearerAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/isbnParam"
 *       - $ref: "#/components/parameters/sequenceNumberParam"
 *     requestBody:
 *       description: The copy's data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               libraryId:
 *                 type: integer
 *               condition:
 *                 type: string
 *             example:
 *               libraryId: 123
 *               condition: "good"
 *     responses:
 *       200:
 *         description: The updated copy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Copies"
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 *       401:
 *         $ref: '#/components/responses/401Unauthorized'
 *       403:
 *         $ref: '#/components/responses/403Forbidden'
 *       404:
 *         $ref: '#/components/responses/404NotFound'
 */
const updateCopy = async (
  ctx: KoaContext<CreateCopyResponse, CopyIdAndIsbnParams, CreateCopyRequest>,
) => {
  ctx.body = await copyService.updateByIsbnAndSequenceNumber(
    ctx.params.isbn,
    ctx.params.id,
    ctx.request.body,
  );
  ctx.status = 200;
};

updateCopy.validateScheme = {
  params: {
    isbn: Joi.string().length(13),
    id: Joi.number().integer().positive(),
  },
  body: {
    libraryId: Joi.number().integer().positive().optional(),
    condition: Joi.string().not().empty().optional(),
  },
};

/**
 * @swagger
 * /api/copies/{isbn}/{sequenceNumber}:
 *   delete:
 *     summary: Delete a copy
 *     tags:
 *      - Copies
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/isbnParam"
 *       - $ref: "#/components/parameters/sequenceNumberParam"
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
const deleteCopy = async (ctx: KoaContext<void, CopyIdAndIsbnParams>) => {
  await copyService.deleteByIsbnAndSequenceNumber(
    ctx.params.isbn,
    ctx.params.id,
  );
  ctx.status = 204;
};

deleteCopy.validateScheme = {
  params: {
    isbn: Joi.string().length(13),
    id: Joi.number().integer().positive(),
  },
};

export default (parent: KoaRouter) => {
  const router = new Router<BoekenclubAppState, BoekenclubAppContext>({
    prefix: '/copies',
  });

  router.use(requireAuthentication);

  const requireAdmin = makeRequireRole(Role.ADMIN);

  router.post(
    '/:isbn',
    validate(createCopy.validateScheme),
    requireAdmin,
    invalidateCacheKeys,
    createCopy,
  );
  router.put(
    '/:isbn/:id',
    validate(updateCopy.validateScheme),
    requireAdmin,
    invalidateCacheKeys,
    updateCopy,
  );
  router.delete(
    '/:isbn/:id',
    validate(deleteCopy.validateScheme),
    requireAdmin,
    invalidateCacheKeys,
    deleteCopy,
  );

  parent.use(router.routes()).use(router.allowedMethods());
};
