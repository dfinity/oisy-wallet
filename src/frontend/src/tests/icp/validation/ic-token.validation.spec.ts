import type { IcToken } from '$icp/types/ic-token';
import {
	isIcToken,
	isIcTokenCanistersStrict,
	isNotIcToken,
	isNotIcTokenCanistersStrict
} from '$icp/validation/ic-token.validation';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockValidToken } from '$tests/mocks/tokens.mock';
import { describe, expect, it } from 'vitest';

describe('ic-token.validation', () => {
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
			expect(isIcTokenCanistersStrict(mockValidIcToken)).toBe(true);
		});

		// TODO: test missing indexCanisterId when it becomes optional
		// it('should return false for a valid IcToken without strict canisters fields', () => {
		// 	expect(isIcTokenCanistersStrict(validIcToken)).toBe(false);
		// });

		it('should return false for a token type casted to IcToken', () => {
			expect(isIcTokenCanistersStrict(mockValidToken as IcToken)).toBe(false);
		});
	});

	describe('isNotIcTokenCanistersStrict', () => {
		it('should return false for a valid IcToken with IcCanistersStrict', () => {
			expect(isNotIcTokenCanistersStrict(mockValidIcToken)).toBe(false);
		});

		// TODO: test missing indexCanisterId when it becomes optional
		// it('should return true for a valid IcToken without strict canisters fields', () => {
		// 	expect(isNotIcTokenCanistersStrict(validIcToken)).toBe(true);
		// });

		it('should return true for a token type casted to IcToken', () => {
			expect(isNotIcTokenCanistersStrict(mockValidToken as IcToken)).toBe(true);
		});
	});
});
