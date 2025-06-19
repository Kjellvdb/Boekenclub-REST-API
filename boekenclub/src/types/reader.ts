import type { Prisma } from '@prisma/client';
import type { IdEntity, ListResponse } from './common';

export interface Reader extends IdEntity {
  name: string;
  email: string;
  address: string;
  password_hash: string;
  roles: Prisma.JsonValue;
}

export interface PublicReader
  extends Pick<Reader, 'id' | 'name' | 'email' | 'address'> {}

export interface ReaderRegisterInput {
  name: string;
  email: string;
  address: string;
  password: string;
}
export interface ReaderUpdateInput
  extends Pick<ReaderRegisterInput, 'name' | 'email' | 'address'> {}
export interface LoginRequest
  extends Pick<ReaderRegisterInput, 'email' | 'password'> {}
export interface GetReaderRequest {
  id: number | 'me';
}
export interface RegisterReaderRequest extends ReaderRegisterInput {}
// prettier-ignore
export interface UpdateReaderRequest
  extends GetReaderRequest,
  Pick<ReaderRegisterInput, 'name' | 'email' | 'address'> {}

export interface GetAllReadersResponse extends ListResponse<PublicReader> {}
export interface GetReaderByIdResponse extends PublicReader {}
export interface RegisterReaderResponse extends GetReaderByIdResponse {}
export interface LoginResponse {
  token: string;
}
export interface UpdateReaderResponse extends GetReaderByIdResponse {}
