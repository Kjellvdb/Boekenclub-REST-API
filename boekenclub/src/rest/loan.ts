import Router from '@koa/router';
import * as loanService from '../service/loan';
import type {
  CreateLoanRequest,
  CreateLoanResponse,
  GetLoansResponse,
  GetLoanByIdResponse,
  UpdateLoanRequest,
  UpdateLoanResponse,
} from '../types/loan';
import type {
  BoekenclubAppContext,
  BoekenclubAppState,
  KoaContext,
  KoaRouter,
} from '../types/koa';
import type { LoanIdParams } from '../types/common';
import Joi from 'joi';
import validate from '../core/validation';
import { makeRequireRole, requireAuthentication } from '../core/auth';
import Role from '../core/roles';
import { serveFromCache, invalidateCacheKeys } from '../core/caching';

/**
 * @swagger
 * tags:
 *   name: Loans
 *   description: Represents a loan in the system
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Loans:
 *       allOf:
 *         - $ref: "#/components/schemas/Id"
 *         - type: object
 *           required:
 *             - library
 *             - copy
 *             - reader
 *             - startDate
 *             - endDate
 *           properties:
 *             library:
 *               type: object
 *               properties:
 *                 id:
 *                   type: number
 *                 name:
 *                   type: string
 *             copy:
 *               type: object
 *               properties:
 *                 sequenceNumber:
 *                   type: number
 *                 bookIsbn:
 *                   type: string
 *             reader:
 *               type: object
 *               properties:
 *                 id:
 *                   type: number
 *                 name:
 *                   type: string
 *             startDate:
 *               type: string
 *               format: date
 *             endDate:
 *               type: string
 *               format: date
 *           example:
 *             id: 123
 *             library:
 *               id: 123
 *               name: "Hogent"
 *             copy:
 *               sequenceNumber: 1
 *               bookIsbn: "9781234567897"
 *             reader:
 *               id: 123
 *               name: "John Doe"
 *             startDate: "2021-05-28"
 *             endDate: "2021-06-28"
 *     LoansList:
 *       required:
 *         - items
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/Loans"
 */

/**
 * @swagger
 * /api/loans:
 *   get:
 *     summary: Get all loans
 *     tags:
 *       - Loans
 *     security:
 *      - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of loans
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/LoansList"
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 *       401:
 *         $ref: '#/components/responses/401Unauthorized'
 *       403:
 *         $ref: '#/components/responses/403Forbidden'
 */
const getLoans = async (ctx: KoaContext<GetLoansResponse>) => {
  ctx.body = { items: await loanService.getAll() };
  ctx.status = 200;
};

getLoans.validateScheme = null;

const getLoanById = async (
  ctx: KoaContext<GetLoanByIdResponse, LoanIdParams>,
) => {
  ctx.body = await loanService.getById(ctx.params.id);
  ctx.status = 200;
};

/**
 * @swagger
 * /api/loans/{id}:
 *   get:
 *     summary: Get a single loan
 *     description: Get a single loan by their id
 *     tags:
 *      - Loans
 *     security:
 *      - bearerAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/idParam"
 *     responses:
 *       200:
 *         description: The requested loan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Loans"
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 *       401:
 *         $ref: '#/components/responses/401Unauthorized'
 *       403:
 *         $ref: '#/components/responses/403Forbidden'
 *       404:
 *         $ref: '#/components/responses/404NotFound'
 */
getLoanById.validateScheme = {
  params: {
    id: Joi.number().integer().positive(),
  },
};

/**
 * @swagger
 * /api/loans/:
 *   post:
 *     summary: Create a new loan
 *     tags:
 *      - Loans
 *     security:
 *      - bearerAuth: []
 *     requestBody:
 *       description: The loan's data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               copySeqNum:
 *                 type: integer
 *                 format: int32
 *               copyBookIsbn:
 *                 type: string
 *                 minLength: 13
 *                 maxLength: 13
 *               readerId:
 *                 type: integer
 *                 format: int32
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *             example:
 *               copySeqNum: 123
 *               copyBookIsbn: "9781234567897"
 *               readerId: 123
 *               startDate: "2021-05-28"
 *               endDate: "2021-06-28"
 *     responses:
 *       201:
 *         description: The created loan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Loans"
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 *       401:
 *         $ref: '#/components/responses/401Unauthorized'
 *       403:
 *         $ref: '#/components/responses/403Forbidden'
 *       404:
 *         $ref: '#/components/responses/404NotFound'
 */
const createLoan = async (
  ctx: KoaContext<CreateLoanResponse, void, CreateLoanRequest>,
) => {
  ctx.body = await loanService.create(ctx.request.body);
  ctx.status = 201;
};

createLoan.validateScheme = {
  body: {
    copySeqNum: Joi.number().integer().positive(),
    copyBookIsbn: Joi.string().length(13),
    readerId: Joi.number().integer().positive(),
    startDate: Joi.date().iso().less('now'),
    endDate: Joi.date().iso().greater(Joi.ref('startDate')),
  },
};

/**
 * @swagger
 * /api/loans/{id}:
 *   put:
 *     summary: Update an existing loan
 *     tags:
 *      - Loans
 *     security:
 *      - bearerAuth: []
 *     parameters:
 *      - $ref: "#/components/parameters/idParam"
 *     requestBody:
 *       description: The loan's data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               copySeqNum:
 *                 type: integer
 *                 format: int32
 *               copyBookIsbn:
 *                 type: string
 *                 minLength: 13
 *                 maxLength: 13
 *               readerId:
 *                 type: integer
 *                 format: int32
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *             example:
 *               copySeqNum: 123
 *               copyBookIsbn: "9781234567897"
 *               readerId: 123
 *               startDate: "2021-05-28"
 *               endDate: "2021-06-28"
 *     responses:
 *       200:
 *         description: The updated loan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Loans"
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 *       401:
 *         $ref: '#/components/responses/401Unauthorized'
 *       403:
 *         $ref: '#/components/responses/403Forbidden'
 *       404:
 *         $ref: '#/components/responses/404NotFound'
 */
const updateLoan = async (
  ctx: KoaContext<UpdateLoanResponse, LoanIdParams, UpdateLoanRequest>,
) => {
  ctx.body = await loanService.updateById(ctx.params.id, ctx.request.body);
  ctx.status = 200;
};

updateLoan.validateScheme = {
  params: {
    id: Joi.number().integer().positive(),
  },
  body: {
    copySeqNum: Joi.number().integer().positive().optional(),
    copyBookIsbn: Joi.string().length(13).optional(),
    readerId: Joi.number().integer().positive().optional(),
    startDate: Joi.date().iso().less('now').optional(),
    endDate: Joi.date().iso().optional(),
  },
};

/**
 * @swagger
 * /api/loans/{id}:
 *   delete:
 *     summary: Delete a loan
 *     tags:
 *      - Loans
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
const deleteLoan = async (ctx: KoaContext<void, LoanIdParams>) => {
  await loanService.deleteById(ctx.params.id);
  ctx.status = 204;
};

deleteLoan.validateScheme = {
  params: {
    id: Joi.number().integer().positive(),
  },
};

export default (parent: KoaRouter) => {
  const router = new Router<BoekenclubAppState, BoekenclubAppContext>({
    prefix: '/loans',
  });

  router.use(requireAuthentication);

  const requireAdmin = makeRequireRole(Role.ADMIN);

  router.get(
    '/',
    requireAdmin,
    validate(getLoans.validateScheme),
    serveFromCache,
    getLoans,
  );
  router.get(
    '/:id',
    validate(getLoanById.validateScheme),
    requireAdmin,
    serveFromCache,
    getLoanById,
  );
  router.post(
    '/',
    validate(createLoan.validateScheme),
    requireAdmin,
    invalidateCacheKeys,
    createLoan,
  );
  router.put(
    '/:id',
    validate(updateLoan.validateScheme),
    requireAdmin,
    invalidateCacheKeys,
    updateLoan,
  );
  router.delete(
    '/:id',
    validate(deleteLoan.validateScheme),
    requireAdmin,
    invalidateCacheKeys,
    deleteLoan,
  );

  parent.use(router.routes()).use(router.allowedMethods());
};
