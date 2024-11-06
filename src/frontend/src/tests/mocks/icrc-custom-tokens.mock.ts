import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';

const icrcCustomToken: IcrcCustomToken = {
	enabled: false,
	...mockValidIcToken,
	alternativeName: 'test',
	indexCanisterVersion: 'up-to-date'
};

export const mockIcrcCustomTokens: IcrcCustomToken[] = [
	icrcCustomToken,
	{
		...icrcCustomToken,
		id: parseTokenId('Another ID')
	}
];
