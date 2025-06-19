import type { ListResponse } from './common';
import type { PublicReader } from './reader';

export interface AuthorCreateInput {
  readerId: number;
}
export interface CreateAuthorRequest extends AuthorCreateInput {}

export interface GetAllAuthorsResponse extends ListResponse<PublicReader> {}
export interface GetAuthorByIdResponse extends PublicReader {}
export interface CreateAuthorResponse extends GetAuthorByIdResponse {}
