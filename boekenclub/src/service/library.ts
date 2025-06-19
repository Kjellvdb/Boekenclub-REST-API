import { prisma } from '../data';
import type { Copy, CopyBeforeAvailability } from '../types/copy';
import type {
  Library,
  LibraryCreateInput,
  LibraryUpdateInput,
} from '../types/library';
import ServiceError from '../core/serviceError';
import handleDBError from './_handleDBError';
import * as loanService from './loan';
import * as bookService from './book';

const COPY_SELECT = {
  sequenceNumber: true,
  condition: true,
  book: {
    select: {
      isbn: true,
      title: true,
    },
  },
  library: {
    select: {
      id: true,
      name: true,
    },
  },
};

const addAvailability = async (copy: CopyBeforeAvailability): Promise<Copy> => {
  const loanedSequenceNumbers = await loanService.getLoanedCopies(
    copy.book.isbn,
  );
  return {
    ...copy,
    isAvailable: !loanedSequenceNumbers.includes(copy.sequenceNumber),
  };
};

export const checkLibraryExists = async (id: number): Promise<void> => {
  const library = await prisma.library.findUnique({
    where: {
      id,
    },
  });
  if (!library) {
    throw ServiceError.notFound('No library with this id exists');
  }
};

export const getAll = async (): Promise<Library[]> => {
  return await prisma.library.findMany();
};

export const getById = async (id: number): Promise<Library> => {
  const library = await prisma.library.findUnique({
    where: {
      id,
    },
  });
  if (!library) throw ServiceError.notFound('No library with this id exists');
  return library;
};

export const create = async (library: LibraryCreateInput): Promise<Library> => {
  try {
    return await prisma.library.create({
      data: library,
    });
  } catch (error: any) {
    throw handleDBError(error);
  }
};

export const updateById = async (
  id: number,
  changes: LibraryUpdateInput,
): Promise<Library> => {
  try {
    return await prisma.library.update({
      where: {
        id,
      },
      data: changes,
    });
  } catch (error: any) {
    throw handleDBError(error);
  }
};

export const deleteById = async (id: number): Promise<void> => {
  try {
    await prisma.library.delete({
      where: {
        id,
      },
    });
  } catch (error: any) {
    throw handleDBError(error);
  }
};

export const getLibrarysByAvailableIsbn = async (
  isbn: string,
): Promise<Library[]> => {
  try {
    await bookService.checkBookExists(isbn);
    const copies = await prisma.copy.findMany({
      where: {
        bookIsbn: isbn,
      },
      select: COPY_SELECT,
    });
    const availableCopies = await Promise.all(
      copies.map(async (copy) => await addAvailability(copy)),
    );
    const librariesWithAvailableCopies = availableCopies
      .filter((copy) => copy.isAvailable)
      .map((copy) => copy.library.id);
    return await prisma.library.findMany({
      where: {
        id: {
          in: librariesWithAvailableCopies,
        },
      },
    });
  } catch (error: any) {
    throw handleDBError(error);
  }
};
