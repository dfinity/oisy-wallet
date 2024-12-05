import { IC_CKBTC_INDEX_CANISTER_ID } from '$env/networks.icrc.env';
import type { IcToken } from '$icp/types/ic-token';
import {
	hasIndexCanister,
	hasNoIndexCanister,
	isIcCkToken,
	isIcToken,
	isIcTokenCanistersStrict,
	isNotIcCkToken,
	isNotIcToken,
	isNotIcTokenCanistersStrict
} from '$icp/validation/ic-token.validation';
import { mockValidIcCkToken, mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockValidToken } from '$tests/mocks/tokens.mock';

describe('ic-token.validation', () => {
	const mockValidIcTokenWithIndex: IcToken = {
		...mockValidIcToken,
		indexCanisterId: IC_CKBTC_INDEX_CANISTER_ID
	};

	describe('isIcToken', () => {
		it('should return true for a valid IcToken', () => {
			expect(isIcToken(mockValidIcToken)).toBe(true);
		});

		it('should return false for an invalid IcToken', () => {
			expect(isIcToken(mockValidToken)).toBe(false);
		});
	});

	describe('isNotIcToken', () => {
		it('should return false for a valid IcToken', () => {
			expect(isNotIcToken(mockValidIcToken)).toBe(false);
		});

		it('should return true for an invalid IcToken', () => {
			expect(isNotIcToken(mockValidToken)).toBe(true);
		});
	});

	describe('isIcTokenCanistersStrict', () => {
		it('should return true for a valid IcToken with IcCanistersStrict', () => {
			expect(isIcTokenCanistersStrict(mockValidIcTokenWithIndex)).toBe(true);
		});

		it('should return false for a valid IcToken without strict canisters fields', () => {
			expect(isIcTokenCanistersStrict(mockValidIcToken)).toBe(false);
		});

		it('should return false for a token type casted to IcToken', () => {
			expect(isIcTokenCanistersStrict(mockValidToken as IcToken)).toBe(false);
		});
	});

	describe('isNotIcTokenCanistersStrict', () => {
		it('should return false for a valid IcToken with IcCanistersStrict', () => {
			expect(isNotIcTokenCanistersStrict(mockValidIcTokenWithIndex)).toBe(false);
		});

		it('should return true for a valid IcToken without strict canisters fields', () => {
			expect(isNotIcTokenCanistersStrict(mockValidIcToken)).toBe(true);
		});

		it('should return true for a token type casted to IcToken', () => {
			expect(isNotIcTokenCanistersStrict(mockValidToken as IcToken)).toBe(true);
		});
	});

	describe('isIcCkToken', () => {
		it('should return true for a valid IcCkToken', () => {
			expect(isIcCkToken(mockValidIcCkToken)).toBe(true);
		});

		it('should return true for a valid IcCkToken that does not have optional props', () => {
			expect(isIcCkToken(mockValidIcCkToken)).toBe(true);
		});

		it('should return false for an invalid IcToken', () => {
			expect(isIcCkToken(mockValidToken)).toBe(false);
		});
	});

	describe('isNotIcCkToken', () => {
		it('should return false for a valid IcCkToken', () => {
			expect(isNotIcCkToken(mockValidIcCkToken)).toBe(false);
		});

		it('should return false for a valid IcCkToken that does not have optional props', () => {
			expect(isNotIcCkToken(mockValidIcCkToken)).toBe(false);
		});

		it('should return true for an invalid IcToken', () => {
			expect(isNotIcCkToken(mockValidToken)).toBe(true);
		});
	});

	describe('hasIndexCanister', () => {
		it('should return false for an IcToken without Index canister', () => {
			expect(hasIndexCanister(mockValidIcToken)).toBe(false);
		});

		it('should return true for an IcToken with Index canister', () => {
			expect(hasIndexCanister(mockValidIcTokenWithIndex)).toBe(true);
		});

		it('should return false for a token type casted to IcToken', () => {
			expect(hasIndexCanister(mockValidToken as IcToken)).toBe(false);
		});
	});

	describe('hasNoIndexCanister', () => {
		it('should return true for an IcToken without Index canister', () => {
			expect(hasNoIndexCanister(mockValidIcToken)).toBe(true);
		});

		it('should return false for an IcToken with Index canister', () => {
			expect(hasNoIndexCanister(mockValidIcTokenWithIndex)).toBe(false);
		});

		it('should return true for a token type casted to IcToken', () => {
			expect(hasNoIndexCanister(mockValidToken as IcToken)).toBe(true);
		});
	});
});
