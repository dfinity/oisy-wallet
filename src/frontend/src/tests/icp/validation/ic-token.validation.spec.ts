import { IC_CKBTC_INDEX_CANISTER_ID } from '$env/networks/networks.icrc.env';
import type { IcToken } from '$icp/types/ic-token';
import {
	hasIndexCanister,
	hasNoIndexCanister,
	isIcCkToken,
	isIcToken,
	isIcTokenCanistersStrict,
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
			expect(isIcToken(mockValidIcToken)).toBeTruthy();
		});

		it('should return false for an invalid IcToken', () => {
			expect(isIcToken(mockValidToken)).toBeFalsy();
		});
	});

	describe('isNotIcToken', () => {
		it('should return false for a valid IcToken', () => {
			expect(isNotIcToken(mockValidIcToken)).toBeFalsy();
		});

		it('should return true for an invalid IcToken', () => {
			expect(isNotIcToken(mockValidToken)).toBeTruthy();
		});
	});

	describe('isIcTokenCanistersStrict', () => {
		it('should return true for a valid IcToken with IcCanistersStrict', () => {
			expect(isIcTokenCanistersStrict(mockValidIcTokenWithIndex)).toBeTruthy();
		});

		it('should return false for a valid IcToken without strict canisters fields', () => {
			expect(isIcTokenCanistersStrict(mockValidIcToken)).toBeFalsy();
		});

		it('should return false for a token type casted to IcToken', () => {
			expect(isIcTokenCanistersStrict(mockValidToken as IcToken)).toBeFalsy();
		});
	});

	describe('isNotIcTokenCanistersStrict', () => {
		it('should return false for a valid IcToken with IcCanistersStrict', () => {
			expect(isNotIcTokenCanistersStrict(mockValidIcTokenWithIndex)).toBeFalsy();
		});

		it('should return true for a valid IcToken without strict canisters fields', () => {
			expect(isNotIcTokenCanistersStrict(mockValidIcToken)).toBeTruthy();
		});

		it('should return true for a token type casted to IcToken', () => {
			expect(isNotIcTokenCanistersStrict(mockValidToken as IcToken)).toBeTruthy();
		});
	});

	describe('isIcCkToken', () => {
		it('should return true for a valid IcCkToken', () => {
			expect(isIcCkToken(mockValidIcCkToken)).toBeTruthy();
		});

		it('should return true for a valid IcCkToken that does not have optional props', () => {
			expect(isIcCkToken(mockValidIcCkToken)).toBeTruthy();
		});

		it('should return false for an invalid IcToken', () => {
			expect(isIcCkToken(mockValidToken)).toBeFalsy();
		});
	});

	describe('hasIndexCanister', () => {
		it('should return false for an IcToken without Index canister', () => {
			expect(hasIndexCanister(mockValidIcToken)).toBeFalsy();
		});

		it('should return true for an IcToken with Index canister', () => {
			expect(hasIndexCanister(mockValidIcTokenWithIndex)).toBeTruthy();
		});

		it('should return false for a token type casted to IcToken', () => {
			expect(hasIndexCanister(mockValidToken as IcToken)).toBeFalsy();
		});
	});

	describe('hasNoIndexCanister', () => {
		it('should return true for an IcToken without Index canister', () => {
			expect(hasNoIndexCanister(mockValidIcToken)).toBeTruthy();
		});

		it('should return false for an IcToken with Index canister', () => {
			expect(hasNoIndexCanister(mockValidIcTokenWithIndex)).toBeFalsy();
		});

		it('should return true for a token type casted to IcToken', () => {
			expect(hasNoIndexCanister(mockValidToken as IcToken)).toBeTruthy();
		});
	});
});
