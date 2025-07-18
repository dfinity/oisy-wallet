import icpDark from '$lib/assets/networks/dark/icp.svg';
import {
	NetworkAppMetadataSchema,
	NetworkBuySchema,
	NetworkEnvironmentSchema,
	NetworkIdSchema,
	NetworkSchema
} from '$lib/schema/network.schema';
import { parseNetworkId } from '$lib/validation/network.validation';

describe('network.schema', () => {
	describe('NetworkIdSchema', () => {
		it('should validate with a symbol as NetworkId', () => {
			const networkId = Symbol('NetworkId');

			expect(NetworkIdSchema.parse(networkId)).toEqual(networkId);
		});

		it('should fail validation with a string instead of a symbol', () => {
			const invalidNetworkId = 'NetworkId';

			expect(() => NetworkIdSchema.parse(invalidNetworkId)).toThrow();
		});
	});

	describe('NetworkEnvironmentSchema', () => {
		it('should validate "mainnet" as a supported network environment', () => {
			const validEnv = 'mainnet';

			expect(NetworkEnvironmentSchema.parse(validEnv)).toEqual(validEnv);
		});

		it('should validate "testnet" as a supported network environment', () => {
			const validEnv = 'testnet';

			expect(NetworkEnvironmentSchema.parse(validEnv)).toEqual(validEnv);
		});

		it('should fail validation with an unsupported network environment', () => {
			const invalidEnv = 'unsupported-env';

			expect(() => NetworkEnvironmentSchema.parse(invalidEnv)).toThrow();
		});
	});

	describe('NetworkBuySchema', () => {
		it('should validate with an optional onramperId', () => {
			const validBuy = { onramperId: 'icp' };

			expect(NetworkBuySchema.parse(validBuy)).toEqual(validBuy);
		});

		it('should validate with an empty object (onramperId optional)', () => {
			const validBuy = {};

			expect(NetworkBuySchema.parse(validBuy)).toEqual(validBuy);
		});

		// TODO: unskip the below when we have a way to validate OnramperNetworkId
		// For now this test is failing because the OnramperNetworkId is not correctly validated
		it.skip('should fail validation with an invalid onramperId', () => {
			const invalidBuy = { onramperId: 'invalid-id' };

			expect(() => NetworkBuySchema.parse(invalidBuy)).toThrow();
		});
	});

	describe('NetworkAppMetadataSchema', () => {
		it('should validate complete metadata', () => {
			const validMetadata = {
				explorerUrl: 'https://example.com/explorer'
			};

			expect(NetworkAppMetadataSchema.parse(validMetadata)).toEqual(validMetadata);
		});

		it('should fail validation with an invalid explorer URL', () => {
			const invalidMetadata = {
				explorerUrl: 'invalid-url'
			};

			expect(() => NetworkAppMetadataSchema.parse(invalidMetadata)).toThrow();
		});

		it('should fail validation with missing explorer URL', () => {
			const invalidMetadata = {};

			expect(() => NetworkAppMetadataSchema.parse(invalidMetadata)).toThrow();
		});
	});

	describe('NetworkSchema', () => {
		const validNetworkWithRequiredFields = {
			id: parseNetworkId('NetworkId'),
			env: 'testnet',
			name: 'Test Network'
		};

		const validNetwork = {
			...validNetworkWithRequiredFields,
			iconLight: 'https://example.com/icon.svg',
			iconDark: icpDark,
			buy: { onramperId: 'icp' }
		};

		it('should validate a complete network', () => {
			expect(NetworkSchema.parse(validNetwork)).toEqual(validNetwork);
		});

		it('should validate a network with only required fields', () => {
			expect(NetworkSchema.parse(validNetworkWithRequiredFields)).toEqual(
				validNetworkWithRequiredFields
			);
		});

		it('should fail validation when id is missing', () => {
			const { id: _, ...invalidNetwork } = validNetwork;

			expect(() => NetworkSchema.parse(invalidNetwork)).toThrow();
		});

		it('should fail validation when env is missing', () => {
			const { env: _, ...invalidNetwork } = validNetwork;

			expect(() => NetworkSchema.parse(invalidNetwork)).toThrow();
		});

		it('should fail validation when name is missing', () => {
			const { name: _, ...invalidNetwork } = validNetwork;

			expect(() => NetworkSchema.parse(invalidNetwork)).toThrow();
		});

		it('should fail validation when icon is not a valid SVG string', () => {
			const invalidNetwork = {
				...validNetwork,
				iconLight: 'https://example.com/invalid-icon.png'
			};

			expect(() => NetworkSchema.parse(invalidNetwork)).toThrow();
		});

		it('should fail validation when iconBW is not a valid SVG string', () => {
			const invalidNetwork = {
				...validNetwork,
				iconLight: 'https://example.com/invalid-icon-bw.png'
			};

			expect(() => NetworkSchema.parse(invalidNetwork)).toThrow();
		});
	});
});
