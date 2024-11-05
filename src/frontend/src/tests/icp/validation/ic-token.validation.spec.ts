import { ICP_NETWORK } from '$env/networks.env';
import { IC_CKBTC_INDEX_CANISTER_ID, IC_CKBTC_LEDGER_CANISTER_ID } from '$env/networks.icrc.env';
import type { IcCanisters, IcToken } from '$icp/types/ic-token';
import {
	isIcToken,
	isIcTokenCanistersStrict,
	isNotIcToken,
	isNotIcTokenCanistersStrict
} from '$icp/validation/ic-token.validation';
import type { Token } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { describe, expect, it } from 'vitest';

describe('ic-token.validation', () => {
	const validToken: Token = {
		id: parseTokenId('TokenId'),
		network: ICP_NETWORK,
		standard: 'icp',
		category: 'default',
		name: 'SampleToken',
		symbol: 'STK',
		decimals: 8
	};

	const validIcCanisters: IcCanisters = {
		ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
		// TODO: to be removed when indexCanisterId becomes optional
		indexCanisterId: IC_CKBTC_INDEX_CANISTER_ID
	};

	const validIcToken: IcToken = {
		...validToken,
		...validIcCanisters,
		fee: 123n,
		position: 1
	};

	describe('isIcToken', () => {
		it('should return true for a valid IcToken', () => {
			expect(isIcToken(validIcToken)).toBe(true);
		});

		it('should return false for an invalid IcToken', () => {
			expect(isIcToken(validToken)).toBe(false);
		});
	});

	describe('isNotIcToken', () => {
		it('should return false for a valid IcToken', () => {
			expect(isNotIcToken(validIcToken)).toBe(false);
		});

		it('should return true for an invalid IcToken', () => {
			expect(isNotIcToken(validToken)).toBe(true);
		});
	});

	describe('isIcTokenCanistersStrict', () => {
		it('should return true for a valid IcToken with IcCanistersStrict', () => {
			expect(isIcTokenCanistersStrict(validIcToken)).toBe(true);
		});

		// TODO: test missing indexCanisterId when it becomes optional
		// it('should return false for a valid IcToken without strict canisters fields', () => {
		// 	expect(isIcTokenCanistersStrict(validIcToken)).toBe(false);
		// });

		it('should return false for a token type casted to IcToken', () => {
			expect(isIcTokenCanistersStrict(validToken as IcToken)).toBe(false);
		});
	});

	describe('isNotIcTokenCanistersStrict', () => {
		it('should return false for a valid IcToken with IcCanistersStrict', () => {
			expect(isNotIcTokenCanistersStrict(validIcToken)).toBe(false);
		});

		// TODO: test missing indexCanisterId when it becomes optional
		// it('should return true for a valid IcToken without strict canisters fields', () => {
		// 	expect(isNotIcTokenCanistersStrict(validIcToken)).toBe(true);
		// });

		it('should return true for a token type casted to IcToken', () => {
			expect(isNotIcTokenCanistersStrict(validToken as IcToken)).toBe(true);
		});
	});
});
