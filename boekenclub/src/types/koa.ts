import type { ParameterizedContext } from 'koa';
import type Application from 'koa';
import type Router from '@koa/router';
import type { SessionInfo } from './auth';

export interface BoekenclubAppState {
  session: SessionInfo;
}

export interface BoekenclubAppContext<
  Params = unknown,
  RequestBody = unknown,
  Query = unknown,
> {
  request: {
    body: RequestBody;
    query: Query;
  };
  params: Params;
}

export type KoaContext<
  ResponseBody = unknown,
  Params = unknown,
  RequestBody = unknown,
  Query = unknown,
> = ParameterizedContext<
  BoekenclubAppState,
  BoekenclubAppContext<Params, RequestBody, Query>,
  ResponseBody
>;
export interface KoaApplication
  extends Application<BoekenclubAppState, BoekenclubAppContext> {}

export interface KoaRouter
  extends Router<BoekenclubAppState, BoekenclubAppContext> {}
