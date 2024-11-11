import { ETHEREUM_NETWORK, ICP_NETWORK } from '$env/networks.env';
import { IC_CKBTC_INDEX_CANISTER_ID, IC_CKBTC_LEDGER_CANISTER_ID } from '$env/networks.icrc.env';
import { ETHEREUM_TOKEN, ETHEREUM_TOKEN_ID, ICP_TOKEN, ICP_TOKEN_ID } from '$env/tokens.env';
import type { EthereumUserToken } from '$eth/types/erc20-user-token';
import { ICP_TRANSACTION_FEE_E8S } from '$icp/constants/icp.constants';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import {
	isEthereumUserTokenDisabled,
	isIcrcCustomTokenDisabled
} from '$lib/utils/token-toggle.utils';
import { describe, expect } from 'vitest';

describe('isEthereumUserTokenDisabled', () => {
	it('should check if default ethereum user token is disabled for token toggle', () => {
		const token: EthereumUserToken = {
			id: ETHEREUM_TOKEN_ID,
			name: ETHEREUM_TOKEN.name,
			decimals: ETHEREUM_TOKEN.decimals,
			network: ETHEREUM_NETWORK,
			symbol: ETHEREUM_NETWORK.name,
			standard: 'ethereum',
			enabled: false,
			category: 'default'
		};

		expect(isEthereumUserTokenDisabled(token)).toBe(true);
	});

	it('should check if custom ethereum user token is disabled for token toggle', () => {
		const token: EthereumUserToken = {
			id: ETHEREUM_TOKEN_ID,
			name: ETHEREUM_TOKEN.name,
			decimals: ETHEREUM_TOKEN.decimals,
			network: ETHEREUM_NETWORK,
			symbol: ETHEREUM_NETWORK.name,
			standard: 'ethereum',
			enabled: false,
			category: 'custom'
		};

		expect(isEthereumUserTokenDisabled(token)).toBe(false);
	});
});

describe('isIcrcCustomTokenDisabled', () => {
	it('should check if icrc custom token is disabled for token toggle', () => {
		const token: IcrcCustomToken = {
			id: ICP_TOKEN_ID,
			name: ICP_TOKEN.name,
			decimals: ICP_TOKEN.decimals,
			network: ICP_NETWORK,
			symbol: ICP_NETWORK.name,
			ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
			indexCanisterId: IC_CKBTC_INDEX_CANISTER_ID,
			indexCanisterVersion: 'up-to-date',
			standard: 'icp',
			category: 'default',
			position: 0,
			enabled: false,
			fee: ICP_TRANSACTION_FEE_E8S
		};

		expect(isIcrcCustomTokenDisabled(token)).toBe(true);
	});

	it('should check if custom icrc custom token is disabled for token toggle', () => {
		const token: IcrcCustomToken = {
			id: ICP_TOKEN_ID,
			name: ICP_TOKEN.name,
			decimals: ICP_TOKEN.decimals,
			network: ICP_NETWORK,
			symbol: ICP_NETWORK.name,
			ledgerCanisterId: 'mxzaz-hqaaa-aaaar-qaadu-cai',
			indexCanisterId: IC_CKBTC_INDEX_CANISTER_ID,
			indexCanisterVersion: 'up-to-date',
			standard: 'icp',
			category: 'custom',
			position: 0,
			enabled: false,
			fee: ICP_TRANSACTION_FEE_E8S
		};

		expect(isIcrcCustomTokenDisabled(token)).toBe(false);
	});

	it('should check if outdated custom icrc custom token is disabled for token toggle', () => {
		const token: IcrcCustomToken = {
			id: ICP_TOKEN_ID,
			name: ICP_TOKEN.name,
			decimals: ICP_TOKEN.decimals,
			network: ICP_NETWORK,
			symbol: ICP_NETWORK.name,
			ledgerCanisterId: 'mxzaz-hqaaa-aaaar-qaadu-cai',
			indexCanisterId: IC_CKBTC_INDEX_CANISTER_ID,
			indexCanisterVersion: 'outdated',
			standard: 'icp',
			category: 'custom',
			position: 0,
			enabled: false,
			fee: ICP_TRANSACTION_FEE_E8S
		};

		expect(isIcrcCustomTokenDisabled(token)).toBe(true);
	});
});
