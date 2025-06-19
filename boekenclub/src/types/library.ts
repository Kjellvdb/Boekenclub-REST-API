import type { IdEntity, ListResponse } from './common';

export interface Library extends IdEntity {
  name: string;
  website: string;
  email: string;
  address: string;
}

export interface LibraryCreateInput {
  name: string;
  website: string;
  email: string;
  address: string;
}
export interface LibraryUpdateInput extends LibraryCreateInput {}
export interface CreateLibraryRequest extends LibraryCreateInput {}
export interface UpdateLibraryRequest extends LibraryUpdateInput {}

export interface GetAllLibrariesResponse extends ListResponse<Library> {}
export interface GetLibraryByIdResponse extends Library {}
export interface CreateLibraryResponse extends GetLibraryByIdResponse {}
export interface UpdateLibraryResponse extends CreateLibraryResponse {}
export interface GetLibrariesByBookIsbnResponse
  extends GetAllLibrariesResponse {}
