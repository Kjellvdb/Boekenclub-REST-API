import type { IsbnEntity, ListResponse } from './common';
import type { Reader } from './reader';

export interface Book extends IsbnEntity {
  title: string;
  publicationDate: Date;
  author: Pick<Reader, 'id' | 'name'>;
}

export interface BookCreateInput extends BookUpdateInput {
  isbn: string;
}
export interface BookUpdateInput {
  authorId: number;
  title: string;
  publicationDate: Date;
}
export interface CreateBookRequest extends BookCreateInput {}
export interface UpdateBookRequest extends BookUpdateInput {}

export interface GetAllBooksResponse extends ListResponse<Book> {}
export interface GetBooksByAuthorIdResponse extends GetAllBooksResponse {}
export interface GetBookByIsbnResponse extends Book {}
export interface CreateBookResponse extends GetBookByIsbnResponse {}
export interface UpdateBookResponse extends GetBookByIsbnResponse {}
export interface GetRandomBookResponse extends GetBookByIsbnResponse {}
