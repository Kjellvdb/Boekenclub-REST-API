import { prisma } from '../data';
import type {
  Review,
  ReviewCreateInput,
  ReviewUpdateInput,
} from '../types/review';
import handleDBError from './_handleDBError';
import * as readerService from './reader';
import * as bookService from './book';

const REVIEW_SELECT = {
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
  rating: true,
  content: true,
  date: true,
};

export const getByReaderId = async (id: number): Promise<Review[]> => {
  try {
    await readerService.checkReaderExists(id);
    return await prisma.review.findMany({
      where: {
        reader: {
          id,
        },
      },
      select: REVIEW_SELECT,
    });
  } catch (error: any) {
    throw handleDBError(error);
  }
};

export const create = async (review: ReviewCreateInput): Promise<Review> => {
  try {
    await readerService.checkReaderExists(review.readerId);
    await bookService.checkBookExists(review.bookIsbn);
    return await prisma.review.create({
      data: {
        ...review,
        date: new Date().toISOString(),
      },
      select: REVIEW_SELECT,
    });
  } catch (error: any) {
    throw handleDBError(error);
  }
};

export const updateByReaderIdAndIsbn = async (
  readerId: number,
  bookIsbn: string,
  changes: ReviewUpdateInput,
): Promise<Review> => {
  try {
    await readerService.checkReaderExists(readerId);
    await bookService.checkBookExists(bookIsbn);
    return await prisma.review.update({
      where: {
        readerId_bookIsbn: {
          readerId,
          bookIsbn,
        },
      },
      data: {
        ...changes,
        date: new Date().toISOString(),
      },
      select: REVIEW_SELECT,
    });
  } catch (error: any) {
    throw handleDBError(error);
  }
};

export const deleteByReaderIdAndIsbn = async (
  readerId: number,
  bookIsbn: string,
): Promise<void> => {
  try {
    await readerService.checkReaderExists(readerId);
    await bookService.checkBookExists(bookIsbn);
    await prisma.review.delete({
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

export const getByIsbn = async (bookIsbn: string): Promise<Review[]> => {
  try {
    await bookService.checkBookExists(bookIsbn);
    return await prisma.review.findMany({
      where: {
        bookIsbn,
      },
      select: REVIEW_SELECT,
    });
  } catch (error: any) {
    throw handleDBError(error);
  }
};
