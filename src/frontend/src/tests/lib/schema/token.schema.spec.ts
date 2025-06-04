import { SEPOLIA_NETWORK } from '$env/networks/networks.eth.env';
import {
	TokenAppearanceSchema,
	TokenBuyableSchema,
	TokenBuySchema,
	TokenCategorySchema,
	TokenIdSchema,
	TokenMetadataSchema,
	TokenSchema,
	TokenStandardSchema
} from '$lib/schema/token.schema';
import { parseTokenId } from '$lib/validation/token.validation';

describe('token.schema', () => {
	describe('TokenIdSchema', () => {
		it('should validate with a symbol as TokenId', () => {
			const tokenId = Symbol('TokenId');

			expect(TokenIdSchema.parse(tokenId)).toEqual(tokenId);
		});

		it('should fail validation with a string instead of a symbol', () => {
			const invalidTokenId = 'TokenId';

			expect(() => TokenIdSchema.parse(invalidTokenId)).toThrow();
		});
	});

	describe('TokenStandardSchema', () => {
		it('should validate "ethereum" as a supported token standard', () => {
			const validStandard = 'ethereum';

			expect(TokenStandardSchema.parse(validStandard)).toEqual(validStandard);
		});

		it('should validate "erc20" as a supported token standard', () => {
			const validStandard = 'erc20';

			expect(TokenStandardSchema.parse(validStandard)).toEqual(validStandard);
		});

		it('should validate "icp" as a supported token standard', () => {
			const validStandard = 'icp';

			expect(TokenStandardSchema.parse(validStandard)).toEqual(validStandard);
		});

		it('should validate "icrc" as a supported token standard', () => {
			const validStandard = 'icrc';

			expect(TokenStandardSchema.parse(validStandard)).toEqual(validStandard);
		});

		it('should validate "bitcoin" as a supported token standard', () => {
			const validStandard = 'bitcoin';

			expect(TokenStandardSchema.parse(validStandard)).toEqual(validStandard);
		});

		it('should validate "solana" as a supported token standard', () => {
			const validStandard = 'solana';

			expect(TokenStandardSchema.parse(validStandard)).toEqual(validStandard);
		});

		it('should fail validation with an unsupported token standard', () => {
			const invalidStandard = 'unsupported-standard';

			expect(() => TokenStandardSchema.parse(invalidStandard)).toThrow();
		});
	});

	describe('TokenCategorySchema', () => {
		it('should validate "default" as a supported token category', () => {
			const validCategory = 'default';

			expect(TokenCategorySchema.parse(validCategory)).toEqual(validCategory);
		});

		it('should validate "custom" as a supported token category', () => {
			const validCategory = 'custom';

			expect(TokenCategorySchema.parse(validCategory)).toEqual(validCategory);
		});

		it('should fail validation with an unsupported token category', () => {
			const invalidCategory = 'unsupported-category';

			expect(() => TokenCategorySchema.parse(invalidCategory)).toThrow();
		});
	});

	describe('TokenMetadataSchema', () => {
		it('should validate complete metadata with a URL icon', () => {
			const validMetadata = {
				name: 'SampleToken',
				symbol: 'STK',
				decimals: 8,
				icon: 'https://example.com/icon.png'
			};

			expect(TokenMetadataSchema.parse(validMetadata)).toEqual(validMetadata);
		});

		it('should validate complete metadata with a base64 icon', () => {
			const validMetadata = {
				name: 'SampleToken',
				symbol: 'STK',
				decimals: 8,
				icon: 'data:image/png;base64,iVBORw0KGgo=' // Very short base64 string
			};

			expect(TokenMetadataSchema.parse(validMetadata)).toEqual(validMetadata);
		});

		it('should validate metadata without an optional icon', () => {
			const validMetadata = {
				name: 'SampleToken',
				symbol: 'STK',
				decimals: 8
			};

			expect(TokenMetadataSchema.parse(validMetadata)).toEqual(validMetadata);
		});

		it('should fail validation with an invalid decimals type', () => {
			const invalidMetadata = {
				name: 'SampleToken',
				symbol: 'STK',
				decimals: 'eight', // Should be a number
				icon: 'https://example.com/icon.png'
			};

			expect(() => TokenMetadataSchema.parse(invalidMetadata)).toThrow();
		});

		it('should fail validation with missing name', () => {
			const invalidMetadata = {
				symbol: 'STK',
				decimals: 8,
				icon: 'https://example.com/icon.png'
			};

			expect(() => TokenMetadataSchema.parse(invalidMetadata)).toThrow();
		});

		it('should fail validation with missing symbol', () => {
			const invalidMetadata = {
				name: 'SampleToken',
				decimals: 8,
				icon: 'https://example.com/icon.png'
			};

			expect(() => TokenMetadataSchema.parse(invalidMetadata)).toThrow();
		});
	});

	describe('TokenAppearanceSchema', () => {
		it('should validate with oisySymbol and oisyName', () => {
			const validAppearance = {
				oisySymbol: { oisySymbol: 'OSYM' },
				oisyName: { prefix: 'OS', oisyName: 'OisyToken' }
			};

			expect(TokenAppearanceSchema.parse(validAppearance)).toEqual(validAppearance);
		});

		it('should validate with only oisySymbol', () => {
			const validAppearance = {
				oisySymbol: { oisySymbol: 'OSYM' }
			};

			expect(TokenAppearanceSchema.parse(validAppearance)).toEqual(validAppearance);
		});

		it('should fail validation with invalid oisySymbol type', () => {
			const invalidAppearance = {
				oisySymbol: { oisySymbol: 123 }
			};

			expect(() => TokenAppearanceSchema.parse(invalidAppearance)).toThrow();
		});
	});

	describe('TokenBuySchema', () => {
		it('should validate with an optional onramperId', () => {
			const validBuy = { onramperId: 'valid-id' };

			expect(TokenBuySchema.parse(validBuy)).toEqual(validBuy);
		});

		it('should validate with an empty object (onramperId optional)', () => {
			const validBuy = {};

			expect(TokenBuySchema.parse(validBuy)).toEqual(validBuy);
		});
	});

	describe('TokenBuyableSchema', () => {
		it('should validate with a buy object', () => {
			const validBuyable = {
				buy: { onramperId: 'valid-id' }
			};

			expect(TokenBuyableSchema.parse(validBuyable)).toEqual(validBuyable);
		});

		it('should validate with an empty object (buy optional)', () => {
			const validBuyable = {};

			expect(TokenBuyableSchema.parse(validBuyable)).toEqual(validBuyable);
		});
	});

	describe('TokenSchema', () => {
		const { chainId: _, explorerUrl: __, providers: ___, ...mockNetwork } = SEPOLIA_NETWORK;

		const validTokenWithRequiredFields = {
			id: parseTokenId('TokenId'),
			network: mockNetwork,
			standard: 'ethereum',
			category: 'default',
			name: 'SampleToken',
			symbol: 'STK',
			decimals: 8
		};

		const validToken = {
			...validTokenWithRequiredFields,
			icon: 'https://example.com/icon.png',
			oisySymbol: { oisySymbol: 'OSYM' },
			oisyName: { prefix: 'OS', oisyName: 'OisyToken' },
			buy: { onramperId: 'valid-id' }
		};

		it('should validate a complete token', () => {
			expect(TokenSchema.parse(validToken)).toEqual(validToken);
		});

		it('should validate a token with only required fields', () => {
			expect(TokenSchema.parse(validTokenWithRequiredFields)).toEqual(validTokenWithRequiredFields);
		});

		it('should fail validation when id is missing', () => {
			const { id: _, ...invalidToken } = validToken;

			expect(() => TokenSchema.parse(invalidToken)).toThrow();
		});

		it('should fail validation when network is missing', () => {
			const { network: _, ...invalidToken } = validToken;

			expect(() => TokenSchema.parse(invalidToken)).toThrow();
		});

		it('should fail validation when standard is missing', () => {
			const { standard: _, ...invalidToken } = validToken;

			expect(() => TokenSchema.parse(invalidToken)).toThrow();
		});

		it('should fail validation when category is missing', () => {
			const { category: _, ...invalidToken } = validToken;

			expect(() => TokenSchema.parse(invalidToken)).toThrow();
		});

		it('should fail validation when name is missing', () => {
			const { name: _, ...invalidToken } = validToken;

			expect(() => TokenSchema.parse(invalidToken)).toThrow();
		});

		it('should fail validation when symbol is missing', () => {
			const { symbol: _, ...invalidToken } = validToken;

			expect(() => TokenSchema.parse(invalidToken)).toThrow();
		});

		it('should fail validation when decimals is missing', () => {
			const { decimals: _, ...invalidToken } = validToken;

			expect(() => TokenSchema.parse(invalidToken)).toThrow();
		});
	});
});
