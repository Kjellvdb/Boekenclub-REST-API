import { prisma } from '../data';
import type {
  PublicReader,
  ReaderRegisterInput,
  ReaderUpdateInput,
} from '../types/reader';
import ServiceError from '../core/serviceError';
import handleDBError from './_handleDBError';
import * as bookService from './book';
import type { SavedBook, SavedBookCreateInput } from '../types/savedbook';
import { hashPassword, verifyPassword } from '../core/password';
import Role from '../core/roles';
import { generateJWT, verifyJWT } from '../core/jwt';
import type { SessionInfo } from '../types/auth';
import jwt from 'jsonwebtoken';
import { getLogger } from '../core/logging';
import type { JsonValue } from '@prisma/client/runtime/library';

const READER_SELECT = {
  id: true,
  name: true,
  email: true,
  address: true,
};

export const checkAndParseSession = async (
  authHeader?: string,
): Promise<SessionInfo> => {
  if (!authHeader) {
    throw ServiceError.unauthorized('You need to be signed in');
  }
  if (!authHeader.startsWith('Bearer ')) {
    throw ServiceError.unauthorized('Invalid authentication token');
  }
  const authToken = authHeader.substring(7);
  try {
    const { roles, sub } = await verifyJWT(authToken);
    return {
      readerId: Number(sub),
      roles,
    };
  } catch (error: any) {
    getLogger().error(error.message, { error });
    if (error instanceof jwt.TokenExpiredError) {
      throw ServiceError.unauthorized('The token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw ServiceError.unauthorized('Invalid authentication token');
    } else {
      throw ServiceError.internalServerError(
        'An unexpected error occurred. Authentication failed',
      );
    }
  }
};

export const checkRole = (role: string, roles: string[]): void => {
  const hasPermission = roles.includes(role);
  if (!hasPermission) {
    throw ServiceError.forbidden(
      'You are not allowed to use this part of the application',
    );
  }
};

export const checkReaderExists = async (id: number): Promise<void> => {
  const reader = await prisma.reader.findUnique({ where: { id } });
  if (!reader) {
    throw ServiceError.notFound('No reader with this id exists');
  }
};

export const checkEmailUsed = async (email: string): Promise<void> => {
  const reader = await prisma.reader.findUnique({ where: { email } });
  if (reader) {
    throw ServiceError.validationFailed(
      'A reader with this email already exists',
    );
  }
};

export const getRolesFromReader = async (id: number): Promise<JsonValue> => {
  const reader = await prisma.reader.findUnique({ where: { id } });
  if (!reader) {
    throw ServiceError.notFound('No reader with this id exists');
  }
  return reader.roles;
};

export const getAll = async (): Promise<PublicReader[]> => {
  return await prisma.reader.findMany({ select: READER_SELECT });
};

export const getById = async (id: number): Promise<PublicReader> => {
  const reader = await prisma.reader.findUnique({
    where: { id },
    select: READER_SELECT,
  });
  if (!reader) {
    throw ServiceError.notFound('No reader with this id exists');
  }
  return reader;
};

export const register = async ({
  name,
  email,
  address,
  password,
}: ReaderRegisterInput): Promise<string> => {
  try {
    await checkEmailUsed(email);
    const password_hash = await hashPassword(password);
    const reader = await prisma.reader.create({
      data: {
        name,
        email,
        address,
        password_hash,
        roles: [Role.READER],
      },
    });
    return await generateJWT(reader);
  } catch (error: any) {
    throw handleDBError(error);
  }
};

export const login = async (
  email: string,
  password: string,
): Promise<string> => {
  const reader = await prisma.reader.findUnique({ where: { email } });
  if (!reader) {
    throw ServiceError.unauthorized(
      'The given email and password do not match',
    );
  }
  const passwordValid = await verifyPassword(password, reader.password_hash);
  if (!passwordValid) {
    throw ServiceError.unauthorized(
      'The given email and password do not match',
    );
  }

  return await generateJWT(reader);
};

export const updateById = async (
  id: number,
  { name, email, address }: ReaderUpdateInput,
): Promise<PublicReader> => {
  try {
    return await prisma.reader.update({
      where: {
        id,
      },
      data: {
        name,
        email,
        address,
      },
      select: READER_SELECT,
    });
  } catch (error: any) {
    throw handleDBError(error);
  }
};

export const deleteById = async (id: number): Promise<void> => {
  try {
    await prisma.reader.delete({
      where: {
        id,
      },
    });
  } catch (error: any) {
    throw handleDBError(error);
  }
};

const INFO_SELECT = {
  reader: {
    select: {
      id: true,
      name: true,
    },
  },
  book: {
    select: {
      isbn: true,
      title: true,
    },
  },
};

export const getSavedByReaderId = async (id: number): Promise<SavedBook[]> => {
  try {
    await checkReaderExists(id);
    return await prisma.savedBooks.findMany({
      where: {
        readerId: id,
      },
      select: INFO_SELECT,
    });
  } catch (error: any) {
    throw handleDBError(error);
  }
};

export const createSaved = async (
  saved: SavedBookCreateInput,
): Promise<SavedBook> => {
  try {
    await checkReaderExists(saved.readerId);
    await bookService.checkBookExists(saved.bookIsbn);
    return await prisma.savedBooks.create({
      data: saved,
      select: INFO_SELECT,
    });
  } catch (error: any) {
    throw handleDBError(error);
  }
};

export const deleteSavedByReaderIdAndIsbn = async (
  readerId: number,
  bookIsbn: string,
): Promise<void> => {
  try {
    await checkReaderExists(readerId);
    await bookService.checkBookExists(bookIsbn);
    await prisma.savedBooks.delete({
      where: {
        readerId_bookIsbn: {
          readerId,
          bookIsbn,
        },
      },
    });
  } catch (error: any) {
    throw handleDBError(error);
  }
};
