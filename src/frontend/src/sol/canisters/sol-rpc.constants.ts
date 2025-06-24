import type { GetAccountInfoEncoding, RpcConfig } from '$declarations/sol_rpc/sol_rpc.did';
import { toNullable } from '@dfinity/utils';

export const SOL_RPC_CONFIG: [] | [RpcConfig] = toNullable();

export const JSON_PARSED: [GetAccountInfoEncoding] = [{ jsonParsed: null }];
