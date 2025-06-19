import type { Reader } from './reader';
import type { Book } from './book';
import type { ListResponse } from './common';

export interface Review {
  rating: number;
  content: string;
  date: Date;
  reader: Pick<Reader, 'id' | 'name'>;
  book: Pick<Book, 'isbn' | 'title'>;
}

export interface ReviewCreateInput {
  readerId: number;
  bookIsbn: string;
  rating: number;
  content: string;
}
export interface ReviewUpdateInput extends ReviewCreateInput {}
export interface CreateReviewRequest extends ReviewCreateInput {}
export interface UpdateReviewRequest extends ReviewUpdateInput {}

export interface GetReviewByReaderIdResponse extends ListResponse<Review> {}
export interface GetReviewByBookIsbnResponse
  extends GetReviewByReaderIdResponse {}
export interface CreateReviewResponse extends Review {}
export interface UpdateReviewResponse extends CreateReviewResponse {}
