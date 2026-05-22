import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import {
	Icrc7CanistersSchema,
	Icrc7InterfaceSchema,
	Icrc7TokenSchema
} from '$icp/schema/icrc7-token.schema';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockIcrc7CanisterId } from '$tests/mocks/icrc7-tokens.mock';

describe('icrc7-token.schema', () => {
	const mockToken = {
		id: parseTokenId('Test'),
		network: ICP_NETWORK,
		standard: { code: 'icrc7' },
		category: 'default',
		tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.CRYPTO }],
		name: 'SampleToken',
		symbol: 'STK',
		decimals: 8
	};

	const mockCanisters = {
		canisterId: mockIcrc7CanisterId
	};

	describe('Icrc7CanistersSchema', () => {
		const validData = mockCanisters;

		it('should validate with correct data', () => {
			expect(Icrc7CanistersSchema.parse(validData)).toEqual(validData);
		});

		it('should fail with invalid canister id', () => {
			const invalidData = {
				...validData,
				canisterId: 'abc'
			};

			expect(() => Icrc7CanistersSchema.parse(invalidData)).toThrow();
		});

		it('should fail with missing canister field', () => {
			const invalidData = {};

			expect(() => Icrc7CanistersSchema.parse(invalidData)).toThrow();
		});
	});

	describe('Icrc7InterfaceSchema', () => {
		const validData = {
			...mockCanisters
		};

		it('should validate with correct data', () => {
			expect(Icrc7InterfaceSchema.parse(validData)).toEqual(validData);
		});

		it('should fail with incorrect Icrc7Canisters data', () => {
			const invalidData = {
				...validData,
				canisterId: 123
			};

			expect(() => Icrc7InterfaceSchema.parse(invalidData)).toThrow();
		});
	});

	describe('Icrc7TokenSchema', () => {
		const validData = {
			...mockToken,
			...mockCanisters
		};

		it('should validate with all required fields', () => {
			expect(Icrc7TokenSchema.parse(validData)).toEqual(validData);
		});

		it('should fail with invalid token', () => {
			const invalidData = {
				...validData,
				id: 'not-a-symbol'
			};

			expect(() => Icrc7TokenSchema.parse(invalidData)).toThrow();
		});

		it('should fail with invalid canister', () => {
			const invalidData = {
				...validData,
				canisterId: 123
			};

			expect(() => Icrc7TokenSchema.parse(invalidData)).toThrow();
		});
	});
});
