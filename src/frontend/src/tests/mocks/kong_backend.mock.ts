import type { TokenReply } from '$declarations/kong_backend/declarations/kong_backend.did';

export const kongIcToken = {
	canister_id: 'eyhua-2aaaa-aaaam-qcf5a-cai',
	chain: 'IC',
	decimals: 8,
	fee: 10000n,
	icrc1: true,
	icrc2: true,
	icrc3: true,
	is_removed: false,
	name: 'kong',
	symbol: 'kong',
	token_id: 121
};

export const kongLpToken = {
	canister_id: 'eyhua-2aaaa-aaaam-qcf5a-cai',
	chain: 'LP',
	decimals: 8,
	fee: 30000n,
	icrc1: true,
	icrc2: false,
	icrc3: false,
	is_removed: false,
	name: 'kong2',
	symbol: 'kong2',
	token_id: 1213
};

export const mockKongBackendTokens = [
	{
		IC: kongIcToken
	},
	{
		LP: kongLpToken
	}
] as TokenReply[];
