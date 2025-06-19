import type { ListResponse, SequenceNumberEntity } from './common';
import type { Book } from './book';
import type { Library } from './library';

export interface Copy extends SequenceNumberEntity {
  book: Pick<Book, 'isbn' | 'title'>;
  condition: string;
  library: Pick<Library, 'id' | 'name'>;
  isAvailable: boolean;
}
export interface CopyBeforeAvailability extends SequenceNumberEntity {
  book: Pick<Book, 'isbn' | 'title'>;
  condition: string;
  library: Pick<Library, 'id' | 'name'>;
}

export interface CopyCreateInput {
  libraryId: number;
  condition: string;
}
export interface CopyUpdateInput extends CopyCreateInput {}
export interface CreateCopyRequest extends CopyCreateInput {}
export interface UpdateCopyRequest extends CopyUpdateInput {}

export interface GetCopyByLibraryIdResponse extends ListResponse<Copy> {}
export interface GetAvailableCopiesByLibraryIdAndIsbnResponse
  extends GetCopyByLibraryIdResponse {}
export interface GetCopiesByIsbnResponse extends GetCopyByLibraryIdResponse {}
export interface CreateCopyResponse extends Copy {}
export interface UpdateCopyResponse extends CreateCopyResponse {}
