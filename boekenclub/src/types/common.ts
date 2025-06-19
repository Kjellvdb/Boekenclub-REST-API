export interface IdEntity {
  id: number;
}
export interface IsbnEntity {
  isbn: string;
}
export interface SequenceNumberEntity {
  sequenceNumber: number;
}

export interface ListResponse<T> {
  items: T[];
}

export interface ReaderIdParams {
  id: number | 'me';
}
export interface IsbnParams {
  isbn: string;
}
export interface ReaderIdAndIsbnParams extends ReaderIdParams, IsbnParams {}
export interface LibraryIdParams {
  id: number;
}
export interface LibraryIdAndIsbnParams extends LibraryIdParams, IsbnParams {}
export interface CopyIdAndIsbnParams extends IsbnParams {
  id: number;
}
export interface LoanIdParams {
  id: number;
}
