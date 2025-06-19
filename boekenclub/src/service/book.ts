import { prisma } from '../data';
import type { Book, BookCreateInput, BookUpdateInput } from '../types/book';
import ServiceError from '../core/serviceError';
import handleDBError from './_handleDBError';
import * as authorService from './author';
import Role from '../core/roles';

const BOOK_SELECT = {
  isbn: true,
  title: true,
  publicationDate: true,
  author: {
    select: {
      id: true,
      name: true,
    },
  },
};

export const checkBookExists = async (isbn: string): Promise<void> => {
  const book = await prisma.book.findUnique({
    where: {
      isbn,
    },
  });
  if (!book) {
    throw ServiceError.notFound('No book with this isbn exists');
  }
};

export const checkBookAuthor = async (
  isbn: string,
  authorId: number,
): Promise<void> => {
  const book = await prisma.book.findUnique({
    where: {
      isbn,
    },
  });
  if (!book) {
    throw ServiceError.notFound('No book with this isbn exists');
  }
  const author = await prisma.reader.findUnique({
    where: {
      id: authorId,
    },
    select: {
      id: true,
      roles: true,
    },
  });
  if (!author) {
    throw ServiceError.notFound('No author with this id exists');
  }
  if (!author.roles || !Array.isArray(author.roles)) {
    throw ServiceError.internalServerError('Something went wrong');
  }
  if (
    !author.roles.includes(Role.ADMIN) &&
    (book.authorId !== authorId || !author.roles.includes(Role.AUTHOR))
  ) {
    throw ServiceError.forbidden(
      'You are not allowed to create or edit this information',
    );
  }
};

export const getAll = async (): Promise<Book[]> => {
  return await prisma.book.findMany({
    select: BOOK_SELECT,
  });
};

export const getByIsbn = async (isbn: string): Promise<Book> => {
  const book = await prisma.book.findUnique({
    where: {
      isbn,
    },
    select: BOOK_SELECT,
  });
  if (!book) {
    throw ServiceError.notFound('No book with this isbn exists');
  }
  return book;
};

export const create = async (book: BookCreateInput): Promise<Book> => {
  try {
    await authorService.checkAuthorExists(book.authorId);
    return await prisma.book.create({
      data: book,
      select: BOOK_SELECT,
    });
  } catch (error: any) {
    throw handleDBError(error);
  }
};

export const updateByIsbn = async (
  isbn: string,
  changes: BookUpdateInput,
): Promise<Book> => {
  try {
    await checkBookAuthor(isbn, changes.authorId);
    return await prisma.book.update({
      where: {
        isbn,
      },
      data: changes,
      select: BOOK_SELECT,
    });
  } catch (error: any) {
    throw handleDBError(error);
  }
};

export const deleteByIsbn = async (
  isbn: string,
  authorId: number,
): Promise<void> => {
  try {
    await checkBookAuthor(isbn, authorId);
    await prisma.book.delete({
      where: {
        isbn,
      },
    });
  } catch (error: any) {
    throw handleDBError(error);
  }
};

export const getRandom = async (): Promise<Book> => {
  const books = await prisma.book.findMany({ select: BOOK_SELECT });
  const randomBook = books[Math.floor(Math.random() * books.length)];
  if (!randomBook) {
    throw ServiceError.notFound('No suggested book found');
  }
  return randomBook;
};

export const getBooksByAuthorId = async (id: number): Promise<Book[]> => {
  try {
    await authorService.checkAuthorExists(id);
    return await prisma.book.findMany({
      where: {
        authorId: id,
      },
      select: BOOK_SELECT,
    });
  } catch (error: any) {
    throw handleDBError(error);
  }
};
