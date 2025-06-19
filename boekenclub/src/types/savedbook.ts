import type { Reader } from './reader';
import type { Book } from './book';
import type { ListResponse } from './common';

export interface SavedBook {
  book: Pick<Book, 'isbn' | 'title'>;
  reader: Pick<Reader, 'id' | 'name'>;
}

export interface SavedBookCreateInput {
  readerId: number;
  bookIsbn: string;
}
export interface CreateSavedBookRequest extends SavedBookCreateInput {}

export interface GetSavedByReaderIdResponse extends ListResponse<SavedBook> {}
export interface CreateSavedResponse extends SavedBook {}
