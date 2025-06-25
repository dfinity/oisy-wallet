import type { AccountInfo } from '$declarations/sol_rpc/sol_rpc.did';
import { SYSTEM_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import { mockSolAddress } from '$tests/mocks/sol.mock';

export const mockParsedAccountInfoAsString =
	'{"info":{"decimals":5,"freezeAuthority":null,"isInitialized":true,"mintAuthority":null,"supply":"8879703657698256210"},"type":"mint"}';

export const mockParsedAccountInfo = {
	info: {
		decimals: 5,
		freezeAuthority: null,
		isInitialized: true,
		mintAuthority: null,
		supply: '8879703657698256210'
	},
	type: 'mint'
};

export const mockAccountInfo: AccountInfo = {
	executable: false,
	owner: mockSolAddress,
	lamports: 1000n,
	data: {
		json: { space: 1n, parsed: mockParsedAccountInfoAsString, program: SYSTEM_PROGRAM_ADDRESS }
	},
	space: 1n,
	rentEpoch: 123n
};
