import Router from '@koa/router';
import * as libraryService from '../service/library';
import * as copyService from '../service/copy';
import type {
  GetAvailableCopiesByLibraryIdAndIsbnResponse,
  GetCopyByLibraryIdResponse,
} from '../types/copy';
import type {
  BoekenclubAppContext,
  BoekenclubAppState,
  KoaContext,
  KoaRouter,
} from '../types/koa';
import type {
  CreateLibraryRequest,
  CreateLibraryResponse,
  GetAllLibrariesResponse,
  GetLibrariesByBookIsbnResponse,
  GetLibraryByIdResponse,
} from '../types/library';
import type {
  LibraryIdParams,
  IsbnParams,
  LibraryIdAndIsbnParams,
} from '../types/common';
import Joi from 'joi';
import validate from '../core/validation';
import { makeRequireRole, requireAuthentication } from '../core/auth';
import Role from '../core/roles';
import { serveFromCache, invalidateCacheKeys } from '../core/caching';

/**
 * @swagger
 * tags:
 *   name: Libraries
 *   description: Represents a library in the system
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Libraries:
 *       allOf:
 *         - $ref: "#/components/schemas/Id"
 *         - type: object
 *           required:
 *             - name
 *             - website
 *             - email
 *             - address
 *           properties:
 *             name:
 *               type: "string"
 *             website:
 *               type: "string"
 *               format: uri
 *             email:
 *               type: "string"
 *               format: email
 *             address:
 *               type: "string"
 *           example:
 *             id: 123
 *             name: "John Doe Library"
 *             website: "http://example.com"
 *             email: "john.doe@example.com"
 *             address: "123 Main St, Anytown, USA"
 *     LibrariesList:
 *       required:
 *         - items
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/Libraries"
 */

/**
 * @swagger
 * /api/libraries:
 *   get:
 *     summary: Get all libraries
 *     tags:
 *       - Libraries
 *     responses:
 *       200:
 *         description: List of libraries
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/LibrariesList"
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 */
const getAllLibrarys = async (ctx: KoaContext<GetAllLibrariesResponse>) => {
  ctx.body = { items: await libraryService.getAll() };
  ctx.status = 200;
};

getAllLibrarys.validateScheme = null;

/**
 * @swagger
 * /api/libraries/{id}:
 *   get:
 *     summary: Get a single library
 *     description: Get a single library by their id
 *     tags:
 *      - Libraries
 *     parameters:
 *       - $ref: "#/components/parameters/idParam"
 *     responses:
 *       200:
 *         description: The requested library
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Libraries"
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 *       404:
 *         $ref: '#/components/responses/404NotFound'
 */
const getLibraryById = async (
  ctx: KoaContext<GetLibraryByIdResponse, LibraryIdParams>,
) => {
  ctx.body = await libraryService.getById(ctx.params.id);
  ctx.status = 200;
};

getLibraryById.validateScheme = {
  params: {
    id: Joi.number().integer().positive(),
  },
};

/**
 * @swagger
 * /api/libraries:
 *   post:
 *     summary: Create a new library
 *     tags:
 *      - Libraries
 *     security:
 *      - bearerAuth: []
 *     requestBody:
 *       description: The library's data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               website:
 *                 type: string
 *                 format: uri
 *               email:
 *                 type: string
 *                 format: email
 *               address:
 *                 type: string
 *             example:
 *               name: "John Doe Library"
 *               website: "http://example.com"
 *               email: "john.doe@example.com"
 *               address: "123 Main St, Anytown, USA"
 *     responses:
 *       201:
 *         description: The created library
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Libraries"
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 *       401:
 *         $ref: '#/components/responses/401Unauthorized'
 *       403:
 *         $ref: '#/components/responses/403Forbidden'
 */
const createLibrary = async (
  ctx: KoaContext<CreateLibraryResponse, void, CreateLibraryRequest>,
) => {
  ctx.body = await libraryService.create(ctx.request.body);
  ctx.status = 201;
};

createLibrary.validateScheme = {
  body: {
    name: Joi.string().not().empty(),
    website: Joi.string().uri().not().empty(),
    email: Joi.string().email().not().empty(),
    address: Joi.string().not().empty(),
  },
};

/**
 * @swagger
 * /api/libraries/{id}:
 *   put:
 *     summary: Update an existing library
 *     tags:
 *      - Libraries
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/idParam"
 *     requestBody:
 *       description: The library's data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               website:
 *                 type: string
 *                 format: uri
 *               email:
 *                 type: string
 *                 format: email
 *               address:
 *                 type: string
 *           example:
 *             name: "John Doe Library"
 *             website: "http://example.com"
 *             email: "john.doe@example.com"
 *             address: "123 Main St, Anytown, USA"
 *     responses:
 *       200:
 *         description: The updated library
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Libraries"
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 *       401:
 *         $ref: '#/components/responses/401Unauthorized'
 *       403:
 *         $ref: '#/components/responses/403Forbidden'
 *       404:
 *         $ref: '#/components/responses/404NotFound'
 */
const updateLibrary = async (
  ctx: KoaContext<CreateLibraryResponse, LibraryIdParams, CreateLibraryRequest>,
) => {
  ctx.body = await libraryService.updateById(ctx.params.id, ctx.request.body);
  ctx.status = 200;
};

updateLibrary.validateScheme = {
  params: {
    id: Joi.number().integer().positive(),
  },
  body: {
    name: Joi.string().not().empty().optional(),
    website: Joi.string().uri().not().empty().optional(),
    email: Joi.string().email().not().empty().optional(),
    address: Joi.string().not().empty().optional(),
  },
};

/**
 * @swagger
 * /api/libraries/{id}:
 *   delete:
 *     summary: Delete a library
 *     tags:
 *      - Libraries
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
const deleteLibrary = async (ctx: KoaContext<void, LibraryIdParams>) => {
  await libraryService.deleteById(ctx.params.id);
  ctx.status = 204;
};

deleteLibrary.validateScheme = {
  params: {
    id: Joi.number().integer().positive(),
  },
};

/**
 * @swagger
 * /api/libraries/{id}/copies:
 *   get:
 *     summary: Get all copies in a library
 *     tags:
 *       - Libraries
 *     parameters:
 *       - $ref: "#/components/parameters/idParam"
 *     responses:
 *       200:
 *         description: List of copies
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CopiesList"
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 *       404:
 *         $ref: '#/components/responses/404NotFound'
 */
const getCopiesByLibraryId = async (
  ctx: KoaContext<GetCopyByLibraryIdResponse, LibraryIdParams>,
) => {
  ctx.body = { items: await copyService.getCopiesByLibraryId(ctx.params.id) };
  ctx.status = 200;
};

getCopiesByLibraryId.validateScheme = {
  params: {
    id: Joi.number().integer().positive(),
  },
};

/**
 * @swagger
 * /api/libraries/available/{isbn}:
 *   get:
 *     summary: Get all libraries with an available copy of a book
 *     tags:
 *       - Libraries
 *     parameters:
 *       - $ref: "#/components/parameters/isbnParam"
 *     responses:
 *       200:
 *         description: List of libraries
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/LibrariesList"
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 *       404:
 *         $ref: '#/components/responses/404NotFound'
 */
const getLibrariesByBookIsbn = async (
  ctx: KoaContext<GetLibrariesByBookIsbnResponse, IsbnParams>,
) => {
  ctx.body = {
    items: await libraryService.getLibrarysByAvailableIsbn(ctx.params.isbn),
  };
  ctx.status = 200;
};

getLibrariesByBookIsbn.validateScheme = {
  params: {
    isbn: Joi.string().length(13),
  },
};

/**
 * @swagger
 * /api/libraries/{id}/available/{isbn}:
 *   get:
 *     summary: Get all available copies of a book in a library
 *     tags:
 *       - Libraries
 *     parameters:
 *       - $ref: "#/components/parameters/idParam"
 *       - $ref: "#/components/parameters/isbnParam"
 *     responses:
 *       200:
 *         description: List of copies
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CopiesList"
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 *       404:
 *         $ref: '#/components/responses/404NotFound'
 */
const getAvailableCopiesByLibraryIdAndIsbn = async (
  ctx: KoaContext<
    GetAvailableCopiesByLibraryIdAndIsbnResponse,
    LibraryIdAndIsbnParams
  >,
) => {
  ctx.body = {
    items: await copyService.getAvailableCopiesByLibraryIdAndIsbn(
      ctx.params.id,
      ctx.params.isbn,
    ),
  };
  ctx.status = 200;
};

getAvailableCopiesByLibraryIdAndIsbn.validateScheme = {
  params: {
    id: Joi.number().integer().positive(),
    isbn: Joi.string().length(13),
  },
};

export default (parent: KoaRouter) => {
  const router = new Router<BoekenclubAppState, BoekenclubAppContext>({
    prefix: '/libraries',
  });

  const requireAdmin = makeRequireRole(Role.ADMIN);

  router.get(
    '/',
    validate(getAllLibrarys.validateScheme),
    serveFromCache,
    getAllLibrarys,
  );
  router.get(
    '/:id',
    validate(getLibraryById.validateScheme),
    serveFromCache,
    getLibraryById,
  );
  router.post(
    '/',
    requireAuthentication,
    requireAdmin,
    validate(createLibrary.validateScheme),
    invalidateCacheKeys,
    createLibrary,
  );
  router.put(
    '/:id',
    requireAuthentication,
    requireAdmin,
    validate(updateLibrary.validateScheme),
    invalidateCacheKeys,
    updateLibrary,
  );
  router.delete(
    '/:id',
    requireAuthentication,
    requireAdmin,
    validate(deleteLibrary.validateScheme),
    invalidateCacheKeys,
    deleteLibrary,
  );

  router.get(
    '/:id/copies',
    validate(getCopiesByLibraryId.validateScheme),
    serveFromCache,
    getCopiesByLibraryId,
  );
  router.get(
    '/available/:isbn',
    validate(getLibrariesByBookIsbn.validateScheme),
    serveFromCache,
    getLibrariesByBookIsbn,
  );
  router.get(
    '/:id/available/:isbn',
    validate(getAvailableCopiesByLibraryIdAndIsbn.validateScheme),
    serveFromCache,
    getAvailableCopiesByLibraryIdAndIsbn,
  );

  parent.use(router.routes()).use(router.allowedMethods());
};
