import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import { isIcrcTokenToggleDisabled } from '$lib/utils/token-toggle.utils';

describe('isIcrcCustomTokenDisabled', () => {
	it('should check if icp default token is disabled for token toggle', () => {
		const token: IcrcCustomToken = { ...ICP_TOKEN, enabled: false };

		expect(isIcrcTokenToggleDisabled(token)).toBeTruthy();
	});

	it('should check if custom icp custom token is disabled for token toggle', () => {
		const token: IcrcCustomToken = {
			...ICP_TOKEN,
			enabled: false,
			category: 'custom',
			ledgerCanisterId: 'mxzaz-hqaaa-aaaar-qaadu-cai'
		};

		expect(isIcrcTokenToggleDisabled(token)).toBeFalsy();
	});

	it('should check if icrc default token is disabled for token toggle', () => {
		const token: IcrcCustomToken = { ...ICP_TOKEN, standard: 'icrc', enabled: false };

		expect(isIcrcTokenToggleDisabled(token)).toBeFalsy();
	});

	it('should check if icrc custom token is disabled for token toggle', () => {
		const token: IcrcCustomToken = {
			...ICP_TOKEN,
			standard: 'icrc',
			category: 'custom',
			enabled: false
		};

		expect(isIcrcTokenToggleDisabled(token)).toBeFalsy();
	});
});
