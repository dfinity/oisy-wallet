import {
	NetworkAppMetadataSchema,
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
			icon: 'https://example.com/icon.svg',
			buy: { onramperId: 'icp' },
			pay: { openCryptoPay: 'Internet Computer' },
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
				icon: 'https://example.com/invalid-icon.png'
			};

			expect(() => NetworkSchema.parse(invalidNetwork)).toThrow();
		});

		it('should fail validation when iconBW is not a valid SVG string', () => {
			const invalidNetwork = {
				...validNetwork,
				icon: 'https://example.com/invalid-icon-bw.png'
			};

			expect(() => NetworkSchema.parse(invalidNetwork)).toThrow();
		});

		it('should accept supportsNft value as true', () => {
			const result = NetworkSchema.parse({ ...validNetwork, supportsNft: true });

			expect(result.supportsNft).toBeTruthy();
		});

		it('should accept supportsNft value as false', () => {
			const result = NetworkSchema.parse({ ...validNetwork, supportsNft: false });

			expect(result.supportsNft).toBeFalsy();
		});

		it('supportsNft value should be optional and undefined when not provided', () => {
			const result = NetworkSchema.parse(validNetwork);

			expect(result.supportsNft).toBeUndefined();
		});
	});
});
