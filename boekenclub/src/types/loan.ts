import type { IdEntity, ListResponse } from './common';
import type { Library } from './library';
import type { Copy } from './copy';
import type { Book } from './book';
import type { Reader } from './reader';

export interface Loan extends IdEntity {
  copy: {
    sequenceNumber: Copy['sequenceNumber'];
    bookIsbn: Book['isbn'];
  };
  library: Pick<Library, 'id' | 'name'>;
  reader: Pick<Reader, 'id' | 'name'>;
  startDate: Date;
  endDate: Date;
}

export interface LoanCreateInput {
  copySeqNum: number;
  copyBookIsbn: string;
  readerId: number;
  startDate: Date;
  endDate: Date;
}
export interface LoanUpdateInput extends LoanCreateInput {}
export interface CreateLoanRequest extends LoanCreateInput {}
export interface UpdateLoanRequest extends LoanUpdateInput {}

export interface GetLoansResponse extends ListResponse<Loan> {}
export interface GetLoanByIdResponse extends Loan {}
export interface GetLoansByReaderIdResponse extends ListResponse<Loan> {}
export interface CreateLoanResponse extends Loan {}
export interface UpdateLoanResponse extends CreateLoanResponse {}
