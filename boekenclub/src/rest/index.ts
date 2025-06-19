import Router from '@koa/router';
import installHealthRouter from './health';
import installReaderRouter from './reader';
import installSessionRouter from './session';
import installAuthorRouter from './author';
import installBookRouter from './book';
import installLibraryRouter from './library';
import installCopyRouter from './copy';
import installLoanRouter from './loan';
import type {
  BoekenclubAppContext,
  BoekenclubAppState,
  KoaApplication,
} from '../types/koa';

/**
 * @swagger
 * components:
 *   schemas:
 *     Id:
 *       required:
 *         - id
 *       properties:
 *         id:
 *           type: integer
 *           format: "int32"
 *     Isbn:
 *       required:
 *         - isbn
 *       properties:
 *         isbn:
 *           type: string
 *     SequenceNumber:
 *       required:
 *         - sequenceNumber
 *       properties:
 *         sequenceNumber:
 *           type: integer
 *           format: "int32"
 *   parameters:
 *     idParam:
 *       in: path
 *       name: id
 *       description: Id of the item to fetch/update/delete
 *       required: true
 *       schema:
 *         type: integer
 *         format: "int32"
 *     isbnParam:
 *       in: path
 *       name: isbn
 *       description: ISBN of the book to fetch/update/delete
 *       required: true
 *       schema:
 *         type: string
 *         minLength: 13
 *         maxLength: 13
 *     sequenceNumberParam:
 *       in: path
 *       name: sequenceNumber
 *       description: Sequence number of the item to fetch/update/delete
 *       required: true
 *       schema:
 *         type: integer
 *         format: "int32"
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   responses:
 *     400BadRequest:
 *       description: You provided invalid data
 *     401Unauthorized:
 *       description: You need to be authenticated to access this resource
 *     403Forbidden:
 *       description: You don't have access to this resource
 *     404NotFound:
 *       description: The requested resource could not be found
 */

export default (app: KoaApplication) => {
  const router = new Router<BoekenclubAppState, BoekenclubAppContext>({
    prefix: '/api',
  });

  installHealthRouter(router);
  installReaderRouter(router);
  installSessionRouter(router);
  installAuthorRouter(router);
  installBookRouter(router);
  installLibraryRouter(router);
  installCopyRouter(router);
  installLoanRouter(router);

  app.use(router.routes()).use(router.allowedMethods());
};
