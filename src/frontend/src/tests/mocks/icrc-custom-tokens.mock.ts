import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';

export const mockIcrcCustomToken: IcrcCustomToken = {
	enabled: false,
	...mockValidIcToken,
	alternativeName: 'test'
};

export const mockIcrcCustomTokens: IcrcCustomToken[] = [
	mockIcrcCustomToken,
	{
		...mockIcrcCustomToken,
		id: parseTokenId('Another ID')
	}
];
