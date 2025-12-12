import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import {
	ExtCanistersSchema,
	ExtInterfaceSchema,
	ExtTokenSchema
} from '$icp/schema/ext-token.schema';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockExtV2TokenCanisterId } from '$tests/mocks/ext-v2-token.mock';

describe('ext-token.schema', () => {
	const mockToken = {
		id: parseTokenId('Test'),
		network: ICP_NETWORK,
		standard: 'ext',
		category: 'default',
		name: 'SampleToken',
		symbol: 'STK',
		decimals: 8
	};

	const mockCanisters = {
		canisterId: mockExtV2TokenCanisterId
	};

	describe('ExtCanistersSchema', () => {
		const validData = mockCanisters;

		it('should validate with correct data', () => {
			expect(ExtCanistersSchema.parse(validData)).toEqual(validData);
		});

		it('should fail with invalid canister id', () => {
			const invalidData = {
				...validData,
				canisterId: 'abc'
			};

			expect(() => ExtCanistersSchema.parse(invalidData)).toThrowError();
		});

		it('should fail with missing canister field', () => {
			const invalidData = {};

			expect(() => ExtCanistersSchema.parse(invalidData)).toThrowError();
		});
	});

	describe('ExtInterfaceSchema', () => {
		const validData = {
			...mockCanisters
		};

		it('should validate with correct data', () => {
			expect(ExtInterfaceSchema.parse(validData)).toEqual(validData);
		});

		it('should fail with incorrect ExtCanisters data', () => {
			const invalidData = {
				...validData,
				canisterId: 123
			};

			expect(() => ExtInterfaceSchema.parse(invalidData)).toThrowError();
		});
	});

	describe('ExtTokenSchema', () => {
		const validData = {
			...mockToken,
			...mockCanisters
		};

		it('should validate with all required fields', () => {
			expect(ExtTokenSchema.parse(validData)).toEqual(validData);
		});

		it('should fail with invalid token', () => {
			const invalidData = {
				...validData,
				id: 'not-a-symbol'
			};

			expect(() => ExtTokenSchema.parse(invalidData)).toThrowError();
		});

		it('should fail with invalid canister', () => {
			const invalidData = {
				...validData,
				canisterId: 123
			};

			expect(() => ExtTokenSchema.parse(invalidData)).toThrowError();
		});
	});
});
