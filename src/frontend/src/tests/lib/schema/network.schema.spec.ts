import {
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

	describe('NetworkSchema', () => {
		const validNetworkWithRequiredFields = {
			id: parseNetworkId('NetworkId'),
			env: 'testnet',
			name: 'Test Network',
			explorerUrl: 'https://example.com/explorer'
		};

		const validNetwork = {
			...validNetworkWithRequiredFields,
			icon: 'https://example.com/icon.svg',
			buy: { onramperId: 'icp' },
			pay: { openCryptoPay: 'InternetComputer' }
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

		it('should accept a non-SVG http(s) URL as icon (custom-network path)', () => {
			const network = {
				...validNetwork,
				icon: 'https://example.com/icon.png'
			};

			expect(NetworkSchema.parse(network).icon).toBe('https://example.com/icon.png');
		});

		it('should accept a data:image/svg+xml icon', () => {
			const svgDataUrl = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=';
			const network = { ...validNetwork, icon: svgDataUrl };

			expect(NetworkSchema.parse(network).icon).toBe(svgDataUrl);
		});

		it('should fail validation when icon is neither an SVG nor a URL', () => {
			const invalidNetwork = {
				...validNetwork,
				icon: 'not-a-url-and-not-an-svg'
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
