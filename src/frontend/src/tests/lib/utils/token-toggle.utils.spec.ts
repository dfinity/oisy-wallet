import { EURC_TOKEN } from '$env/tokens-erc20/tokens.eurc.env';
import { WBTC_TOKEN } from '$env/tokens-erc20/tokens.wbtc.env';
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

	it('should check if default erc20 token is disabled for token toggle', () => {
		const token: EthereumUserToken = { ...EURC_TOKEN, enabled: false };
		expect(isEthereumTokenToggleDisabled(token)).toBe(false);
	});

	it('should check if custom erc20 token is disabled for token toggle', () => {
		const token: EthereumUserToken = { ...WBTC_TOKEN, enabled: false, category: 'custom' };
		expect(isEthereumTokenToggleDisabled(token)).toBe(false);
	});
});

describe('isIcrcCustomTokenDisabled', () => {
	it('should check if icp default token is disabled for token toggle', () => {
		const token: IcrcCustomToken = { ...ICP_TOKEN, enabled: false };
		expect(isIcrcTokenToggleDisabled(token)).toBe(true);
	});

	it('should check if custom icp custom token is disabled for token toggle', () => {
		const token: IcrcCustomToken = {
			...ICP_TOKEN,
			enabled: false,
			category: 'custom',
			ledgerCanisterId: 'mxzaz-hqaaa-aaaar-qaadu-cai'
		};
		expect(isIcrcTokenToggleDisabled(token)).toBe(false);
	});

	it('should check if outdated custom icp custom token is disabled for token toggle', () => {
		const token: IcrcCustomToken = {
			...ICP_TOKEN,
			enabled: false,
			category: 'custom',
			ledgerCanisterId: 'mxzaz-hqaaa-aaaar-qaadu-cai',
			indexCanisterVersion: 'outdated'
		};
		expect(isIcrcTokenToggleDisabled(token)).toBe(true);
	});

	it('should check if icrc default token is disabled for token toggle', () => {
		const token: IcrcCustomToken = { ...ICP_TOKEN, standard: 'icrc', enabled: false };
		expect(isIcrcTokenToggleDisabled(token)).toBe(false);
	});

	it('should check if icrc custom token is disabled for token toggle', () => {
		const token: IcrcCustomToken = {
			...ICP_TOKEN,
			standard: 'icrc',
			category: 'custom',
			enabled: false
		};
		expect(isIcrcTokenToggleDisabled(token)).toBe(false);
	});
});
