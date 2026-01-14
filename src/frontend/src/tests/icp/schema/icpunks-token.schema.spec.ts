import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import {
	IcPunksCanistersSchema,
	IcPunksInterfaceSchema,
	IcPunksTokenSchema
} from '$icp/schema/icpunks-token.schema';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockIcPunksCanisterId } from '$tests/mocks/icpunks-tokens.mock';

describe('icpunks-token.schema', () => {
	const mockToken = {
		id: parseTokenId('Test'),
		network: ICP_NETWORK,
		standard: { code: 'icpunks' },
		category: 'default',
		name: 'SampleToken',
		symbol: 'STK',
		decimals: 8
	};

	const mockCanisters = {
		canisterId: mockIcPunksCanisterId
	};

	describe('IcPunksCanistersSchema', () => {
		const validData = mockCanisters;

		it('should validate with correct data', () => {
			expect(IcPunksCanistersSchema.parse(validData)).toEqual(validData);
		});

		it('should fail with invalid canister id', () => {
			const invalidData = {
				...validData,
				canisterId: 'abc'
			};

			expect(() => IcPunksCanistersSchema.parse(invalidData)).toThrowError();
		});

		it('should fail with missing canister field', () => {
			const invalidData = {};

			expect(() => IcPunksCanistersSchema.parse(invalidData)).toThrowError();
		});
	});

	describe('IcPunksInterfaceSchema', () => {
		const validData = {
			...mockCanisters
		};

		it('should validate with correct data', () => {
			expect(IcPunksInterfaceSchema.parse(validData)).toEqual(validData);
		});

		it('should fail with incorrect IcPunksCanisters data', () => {
			const invalidData = {
				...validData,
				canisterId: 123
			};

			expect(() => IcPunksInterfaceSchema.parse(invalidData)).toThrowError();
		});
	});

	describe('IcPunksTokenSchema', () => {
		const validData = {
			...mockToken,
			...mockCanisters
		};

		it('should validate with all required fields', () => {
			expect(IcPunksTokenSchema.parse(validData)).toEqual(validData);
		});

		it('should fail with invalid token', () => {
			const invalidData = {
				...validData,
				id: 'not-a-symbol'
			};

			expect(() => IcPunksTokenSchema.parse(invalidData)).toThrowError();
		});

		it('should fail with invalid canister', () => {
			const invalidData = {
				...validData,
				canisterId: 123
			};

			expect(() => IcPunksTokenSchema.parse(invalidData)).toThrowError();
		});
	});
});
