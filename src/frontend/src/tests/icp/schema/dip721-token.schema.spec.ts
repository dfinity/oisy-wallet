import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import {
	Dip721CanistersSchema,
	Dip721InterfaceSchema,
	Dip721TokenSchema
} from '$icp/schema/dip721-token.schema';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockDip721TokenCanisterId } from '$tests/mocks/dip721-tokens.mock';

describe('dip721-token.schema', () => {
	const mockToken = {
		id: parseTokenId('Test'),
		network: ICP_NETWORK,
		standard: { code: 'dip721' },
		category: 'default',
		name: 'SampleToken',
		symbol: 'STK',
		decimals: 8
	};

	const mockCanisters = {
		canisterId: mockDip721TokenCanisterId
	};

	describe('Dip721CanistersSchema', () => {
		const validData = mockCanisters;

		it('should validate with correct data', () => {
			expect(Dip721CanistersSchema.parse(validData)).toEqual(validData);
		});

		it('should fail with invalid canister id', () => {
			const invalidData = {
				...validData,
				canisterId: 'abc'
			};

			expect(() => Dip721CanistersSchema.parse(invalidData)).toThrowError();
		});

		it('should fail with missing canister field', () => {
			const invalidData = {};

			expect(() => Dip721CanistersSchema.parse(invalidData)).toThrowError();
		});
	});

	describe('Dip721InterfaceSchema', () => {
		const validData = {
			...mockCanisters
		};

		it('should validate with correct data', () => {
			expect(Dip721InterfaceSchema.parse(validData)).toEqual(validData);
		});

		it('should fail with incorrect Dip721Canisters data', () => {
			const invalidData = {
				...validData,
				canisterId: 123
			};

			expect(() => Dip721InterfaceSchema.parse(invalidData)).toThrowError();
		});
	});

	describe('Dip721TokenSchema', () => {
		const validData = {
			...mockToken,
			...mockCanisters
		};

		it('should validate with all required fields', () => {
			expect(Dip721TokenSchema.parse(validData)).toEqual(validData);
		});

		it('should fail with invalid token', () => {
			const invalidData = {
				...validData,
				id: 'not-a-symbol'
			};

			expect(() => Dip721TokenSchema.parse(invalidData)).toThrowError();
		});

		it('should fail with invalid canister', () => {
			const invalidData = {
				...validData,
				canisterId: 123
			};

			expect(() => Dip721TokenSchema.parse(invalidData)).toThrowError();
		});
	});
});
