import type { AccountInfo, ParsedAccount } from '$declarations/sol_rpc/sol_rpc.did';

export type ParsedAccountInfo = Omit<AccountInfo, 'data'> & {
	data: { json: Omit<ParsedAccount, 'parsed'> & { parsed: { info: object } } };
};
