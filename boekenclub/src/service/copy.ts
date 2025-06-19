import { prisma } from '../data';
import type {
  Copy,
  CopyBeforeAvailability,
  CopyCreateInput,
  CopyUpdateInput,
} from '../types/copy';
import handleDBError from './_handleDBError';
import * as loanService from './loan';
import * as bookService from './book';
import * as libraryService from './library';
import ServiceError from '../core/serviceError';

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

export const checkCopyExists = async (
  bookIsbn: string,
  sequenceNumber: number,
): Promise<void> => {
  if (
    !(await prisma.copy.findFirst({
      where: {
        bookIsbn,
        sequenceNumber,
      },
    }))
  ) {
    throw ServiceError.notFound(
      'No copy with this isbn and sequence number exists',
    );
  }
};

export const checkCopyAvailable = async (
  bookIsbn: string,
  sequenceNumber: number,
): Promise<void> => {
  const copy = await prisma.copy.findFirst({
    where: {
      bookIsbn,
      sequenceNumber,
    },
    select: COPY_SELECT,
  });
  if (!copy) {
    throw ServiceError.notFound(
      'No copy with this isbn and sequence number exists',
    );
  }
  if (!(await addAvailability(copy)).isAvailable) {
    throw ServiceError.conflict('This copy is not available');
  }
};

export const getCopiesByIsbn = async (isbn: string): Promise<Copy[]> => {
  try {
    await bookService.checkBookExists(isbn);
    const copies = await prisma.copy.findMany({
      where: {
        bookIsbn: isbn,
      },
      select: COPY_SELECT,
    });
    return await Promise.all(copies.map((copy) => addAvailability(copy)));
  } catch (error: any) {
    throw handleDBError(error);
  }
};

export const create = async (
  bookIsbn: string,
  copy: CopyCreateInput,
): Promise<Copy> => {
  try {
    await bookService.checkBookExists(bookIsbn);
    await libraryService.checkLibraryExists(copy.libraryId);
    const latestCopy = await prisma.copy.findFirst({
      where: {
        bookIsbn,
      },
      select: {
        sequenceNumber: true,
      },
      orderBy: {
        sequenceNumber: 'desc',
      },
    });
    const latestSequenceNumber = latestCopy ? latestCopy.sequenceNumber + 1 : 1;
    const createdCopy = await prisma.copy.create({
      data: {
        ...copy,
        sequenceNumber: latestSequenceNumber,
        bookIsbn,
      },
      select: COPY_SELECT,
    });
    return await addAvailability(createdCopy);
  } catch (error: any) {
    throw handleDBError(error);
  }
};

export const updateByIsbnAndSequenceNumber = async (
  bookIsbn: string,
  sequenceNumber: number,
  changes: CopyUpdateInput,
): Promise<Copy> => {
  try {
    await bookService.checkBookExists(bookIsbn);
    await checkCopyExists(bookIsbn, sequenceNumber);
    if (changes.libraryId) {
      await libraryService.checkLibraryExists(changes.libraryId);
    }
    const updatedCopy = await prisma.copy.update({
      where: {
        sequenceNumber_bookIsbn: {
          bookIsbn,
          sequenceNumber,
        },
      },
      data: changes,
      select: COPY_SELECT,
    });
    return await addAvailability(updatedCopy);
  } catch (error: any) {
    throw handleDBError(error);
  }
};

export const deleteByIsbnAndSequenceNumber = async (
  bookIsbn: string,
  sequenceNumber: number,
): Promise<void> => {
  try {
    await bookService.checkBookExists(bookIsbn);
    await checkCopyExists(bookIsbn, sequenceNumber);
    await prisma.copy.delete({
      where: {
        sequenceNumber_bookIsbn: {
          bookIsbn,
          sequenceNumber,
        },
      },
    });
  } catch (error: any) {
    throw handleDBError(error);
  }
};

export const getCopiesByLibraryId = async (
  libraryId: number,
): Promise<Copy[]> => {
  try {
    await libraryService.checkLibraryExists(libraryId);
    const copies = await prisma.copy.findMany({
      where: {
        libraryId,
      },
      select: COPY_SELECT,
    });
    return await Promise.all(copies.map((copy) => addAvailability(copy)));
  } catch (error: any) {
    throw handleDBError(error);
  }
};

export const getAvailableCopiesByLibraryIdAndIsbn = async (
  libraryId: number,
  bookIsbn: string,
): Promise<Copy[]> => {
  try {
    await libraryService.checkLibraryExists(libraryId);
    await bookService.checkBookExists(bookIsbn);
    const copies = await prisma.copy.findMany({
      where: {
        libraryId,
        bookIsbn,
      },
      select: COPY_SELECT,
    });
    return (
      await Promise.all(copies.map((copy) => addAvailability(copy)))
    ).filter((copy) => copy.isAvailable);
  } catch (error: any) {
    throw handleDBError(error);
  }
};

export const getLibraryIdByCopy = async (
  isbn: string,
  sequenceNumber: number,
): Promise<number> => {
  try {
    await bookService.checkBookExists(isbn);
    const copy = await prisma.copy.findFirst({
      where: {
        bookIsbn: isbn,
        sequenceNumber,
      },
      select: COPY_SELECT,
    });
    if (!copy) {
      throw ServiceError.notFound(
        'No copy with this isbn and sequence number exists',
      );
    }
    return copy.library.id;
  } catch (error: any) {
    throw handleDBError(error);
  }
};
