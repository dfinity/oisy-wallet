import { IC_CKBTC_INDEX_CANISTER_ID } from '$env/networks.icrc.env';
import type { IcToken } from '$icp/types/ic-token';
import {
	isIcToken,
	isIcTokenCanistersStrict,
	isNotIcToken,
	isNotIcTokenCanistersStrict
} from '$icp/validation/ic-token.validation';
import { validIcToken } from '$tests/mocks/ic-tokens.mock';
import { validToken } from '$tests/mocks/tokens.mock';

describe('ic-token.validation', () => {
	const validIcTokenWithIndex: IcToken = {
		...validIcToken,
		indexCanisterId: IC_CKBTC_INDEX_CANISTER_ID
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
			expect(isIcTokenCanistersStrict(validIcTokenWithIndex)).toBe(true);
		});

		it('should return false for a valid IcToken without strict canisters fields', () => {
			expect(isIcTokenCanistersStrict(validIcToken)).toBe(false);
		});

		it('should return false for a token type casted to IcToken', () => {
			expect(isIcTokenCanistersStrict(validToken as IcToken)).toBe(false);
		});
	});

	describe('isNotIcTokenCanistersStrict', () => {
		it('should return false for a valid IcToken with IcCanistersStrict', () => {
			expect(isNotIcTokenCanistersStrict(validIcTokenWithIndex)).toBe(false);
		});

		it('should return true for a valid IcToken without strict canisters fields', () => {
			expect(isNotIcTokenCanistersStrict(validIcToken)).toBe(true);
		});

		it('should return true for a token type casted to IcToken', () => {
			expect(isNotIcTokenCanistersStrict(validToken as IcToken)).toBe(true);
		});
	});
});
