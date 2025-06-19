import { prisma } from '../data';
import ServiceError from '../core/serviceError';
import handleDBError from './_handleDBError';
import * as readerService from './reader';
import Role from '../core/roles';
import type { PublicReader } from '../types/reader';

const AUTHOR_SELECT = {
  id: true,
  name: true,
  email: true,
  address: true,
};

const throwErrorIfAuthorExists = async (readerId: number): Promise<void> => {
  if (
    await prisma.reader.findFirst({
      where: { id: readerId, roles: { array_contains: Role.AUTHOR } },
    })
  ) {
    throw ServiceError.validationFailed('This reader is already an author');
  }
};

export const checkAuthorExists = async (id: number): Promise<void> => {
  const author = await prisma.reader.findUnique({
    where: {
      id,
      roles: {
        array_contains: Role.AUTHOR,
      },
    },
  });
  if (!author) {
    throw ServiceError.notFound('No author with this id exists');
  }
};

export const getAll = async (): Promise<PublicReader[]> => {
  return await prisma.reader.findMany({
    where: {
      roles: {
        array_contains: Role.AUTHOR,
      },
    },
    select: AUTHOR_SELECT,
  });
};

export const getById = async (id: number): Promise<PublicReader> => {
  const author = await prisma.reader.findUnique({
    where: {
      id,
      roles: {
        array_contains: Role.AUTHOR,
      },
    },
    select: AUTHOR_SELECT,
  });
  if (!author) {
    throw ServiceError.notFound('No author with this id exists');
  }
  return author;
};

export const create = async (readerId: number): Promise<PublicReader> => {
  try {
    await readerService.checkReaderExists(readerId);
    await throwErrorIfAuthorExists(readerId);
    const readerRoles = await readerService.getRolesFromReader(readerId);
    if (!Array.isArray(readerRoles)) {
      throw ServiceError.internalServerError('Something went wrong');
    }
    return await prisma.reader.update({
      where: {
        id: readerId,
      },
      data: {
        roles: [...readerRoles, Role.AUTHOR],
      },
      select: AUTHOR_SELECT,
    });
  } catch (error: any) {
    throw handleDBError(error);
  }
};

export const deleteById = async (id: number): Promise<void> => {
  try {
    await checkAuthorExists(id);
    const readerRoles = await readerService.getRolesFromReader(id);
    if (!Array.isArray(readerRoles)) {
      throw ServiceError.internalServerError('Something went wrong');
    }
    const updatedRoles = readerRoles.filter((role) => role !== Role.AUTHOR);
    await prisma.reader.update({
      where: {
        id,
      },
      data: {
        roles: updatedRoles,
      },
    });
  } catch (error: any) {
    throw handleDBError(error);
  }
};
