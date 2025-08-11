import type { AccountInfo, ParsedAccount } from '$declarations/sol_rpc/sol_rpc.did';
import type { Address, GetAccountInfoApi } from '@solana/kit';

export type ParsedAccountInfo = Omit<AccountInfo, 'data'> & {
	data: { json: Omit<ParsedAccount, 'parsed'> & { parsed: { info: object } } };
};

type ReturnTypeWithArgs<TFunc, TArgs extends unknown[]> = TFunc extends {
	(...args: infer A1): infer R1;
	(...args: infer A2): infer R2;
	(...args: infer A3): infer R3;
	(...args: infer A4): infer R4;
	(...args: infer A5): infer R5;
}
	? [TArgs] extends [A1]
		? R1
		: [TArgs] extends [A2]
			? R2
			: [TArgs] extends [A3]
				? R3
				: [TArgs] extends [A4]
					? R4
					: [TArgs] extends [A5]
						? R5
						: never
	: never;

export type SolanaGetAccountInfoReturn = ReturnTypeWithArgs<
	GetAccountInfoApi['getAccountInfo'],
	[Address, { encoding: 'jsonParsed' }]
>;
