import { ETHEREUM_TOKEN, ICP_TOKEN } from '$env/tokens.env';
import type { EthereumUserToken } from '$eth/types/erc20-user-token';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import {
	isEthereumTokenToggleDisabled,
	isIcrcTokenToggleDisabled
} from '$lib/utils/token-toggle.utils';
import { describe, expect } from 'vitest';

describe('isEthereumUserTokenDisabled', () => {
	it('should check if default ethereum user token is disabled for token toggle', () => {
		const token: EthereumUserToken = { ...ETHEREUM_TOKEN, enabled: false };
		expect(isEthereumTokenToggleDisabled(token)).toBe(true);
	});

	it('should check if custom ethereum user token is disabled for token toggle', () => {
		const token: EthereumUserToken = { ...ETHEREUM_TOKEN, enabled: false, category: 'custom' };
		expect(isEthereumTokenToggleDisabled(token)).toBe(false);
	});
});

describe('isIcrcCustomTokenDisabled', () => {
	it('should check if icrc default token is disabled for token toggle', () => {
		const token: IcrcCustomToken = { ...ICP_TOKEN, enabled: false };
		expect(isIcrcTokenToggleDisabled(token)).toBe(true);
	});

	it('should check if custom icrc custom token is disabled for token toggle', () => {
		const token: IcrcCustomToken = {
			...ICP_TOKEN,
			enabled: false,
			category: 'custom',
			ledgerCanisterId: 'mxzaz-hqaaa-aaaar-qaadu-cai'
		};
		expect(isIcrcTokenToggleDisabled(token)).toBe(false);
	});

	it('should check if outdated custom icrc custom token is disabled for token toggle', () => {
		const token: IcrcCustomToken = {
			...ICP_TOKEN,
			enabled: false,
			category: 'custom',
			ledgerCanisterId: 'mxzaz-hqaaa-aaaar-qaadu-cai',
			indexCanisterVersion: 'outdated'
		};
		expect(isIcrcTokenToggleDisabled(token)).toBe(true);
	});
});
