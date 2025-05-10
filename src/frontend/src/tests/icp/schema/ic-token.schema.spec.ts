import { SEPOLIA_NETWORK } from '$env/networks/networks.eth.env';
import {
	IC_CKBTC_INDEX_CANISTER_ID,
	IC_CKBTC_LEDGER_CANISTER_ID,
	IC_CKBTC_MINTER_CANISTER_ID
} from '$env/networks/networks.icrc.env';
import {
	IcAppMetadataSchema,
	IcCanistersSchema,
	IcCanistersStrictSchema,
	IcCkInterfaceSchema,
	IcCkLinkedAssetsSchema,
	IcCkMetadataSchema,
	IcCkTokenSchema,
	IcFeeSchema,
	IcInterfaceSchema,
	IcTokenSchema,
	IcTokenWithoutIdSchema
} from '$icp/schema/ic-token.schema';
import { parseTokenId } from '$lib/validation/token.validation';

describe('ic-token.schema', () => {
	const { chainId: _, explorerUrl: __, providers: ___, ...mockNetwork } = SEPOLIA_NETWORK;

	const mockToken = {
		id: parseTokenId('Test'),
		network: mockNetwork,
		standard: 'icp',
		category: 'default',
		name: 'SampleToken',
		symbol: 'STK',
		decimals: 8,
		oisySymbol: { oisySymbol: 'OSYM' },
		oisyName: { prefix: 'OS', oisyName: 'OisyToken' },
		buy: { onramperId: 'onramper-id' }
	};

	const mockFee = { fee: 1000n };

	const mockCanisters = {
		ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
		indexCanisterId: IC_CKBTC_INDEX_CANISTER_ID
	};

	const mockApp = {
		position: 1,
		exchangeCoinId: 'bitcoin',
		explorerUrl: 'https://explorer.example.com'
	};

	describe('IcFeeSchema', () => {
		it('should validate with correct data', () => {
			const validData = mockFee;

			expect(IcFeeSchema.parse(validData)).toEqual(validData);
		});

		it('should fail with invalid fee type', () => {
			const invalidData = { fee: 1000 };

			expect(() => IcFeeSchema.parse(invalidData)).toThrow();
		});
	});

	describe('IcAppMetadataSchema', () => {
		const validData = mockApp;

		it('should validate with correct data', () => {
			expect(IcAppMetadataSchema.parse(validData)).toEqual(validData);
		});

		it('should fail with invalid position', () => {
			const invalidData = {
				...validData,
				position: 'first'
			};

			expect(() => IcAppMetadataSchema.parse(invalidData)).toThrow();
		});

		it('should fail with invalid explorerUrl', () => {
			const invalidData = {
				...validData,
				explorerUrl: 'http://localhost:8080'
			};

			expect(() => IcAppMetadataSchema.parse(invalidData)).toThrow();
		});

		it('should fail with invalid exchangeCoinId', () => {
			const invalidData = {
				...validData,
				exchangeCoinId: 'test'
			};

			expect(() => IcAppMetadataSchema.parse(invalidData)).toThrow();
		});
	});

	describe('IcCanistersSchema', () => {
		const validData = mockCanisters;

		it('should validate with correct data', () => {
			expect(IcCanistersSchema.parse(validData)).toEqual(validData);
		});

		it('should validate with ledger canister only', () => {
			const validData = {
				ledgerCanisterId: mockCanisters.ledgerCanisterId
			};

			expect(IcCanistersSchema.parse(validData)).toEqual(validData);
		});

		it('should fail with invalid ledger canister id', () => {
			const invalidData = {
				...validData,
				ledgerCanisterId: 'abc'
			};

			expect(() => IcCanistersSchema.parse(invalidData)).toThrow();
		});

		it('should fail with invalid index canister id', () => {
			const invalidData = {
				...validData,
				indexCanisterId: 'abc'
			};

			expect(() => IcCanistersSchema.parse(invalidData)).toThrow();
		});

		it('should fail with missing ledger canister field', () => {
			const invalidData = {
				indexCanisterId: IC_CKBTC_INDEX_CANISTER_ID
			};

			expect(() => IcCanistersSchema.parse(invalidData)).toThrow();
		});
	});

	describe('IcCanistersStrictSchema', () => {
		const validToken = {
			...mockToken,
			...mockFee,
			...mockCanisters,
			...mockApp
		};

		it('should validate with correct data', () => {
			const validData = {
				ledgerCanisterId: mockCanisters.ledgerCanisterId,
				indexCanisterId: mockCanisters.ledgerCanisterId
			};

			expect(IcCanistersSchema.parse(validData)).toEqual(validData);
		});

		it('should validate a token with index canister correct data', () => {
			expect(() => IcCanistersStrictSchema.parse(validToken)).not.toThrow();
		});

		it('should fail with missing index canister field', () => {
			const invalidData = {
				ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID
			};

			expect(() => IcCanistersStrictSchema.parse(invalidData)).toThrow();
		});

		it('should fail for token with missing index canister field', () => {
			const { indexCanisterId: _, ...tokenWithoutIndexCanisterId } = validToken;

			expect(() => IcCanistersStrictSchema.parse(tokenWithoutIndexCanisterId)).toThrow();
		});
	});

	describe('IcCkLinkedAssetsSchema', () => {
		const validData = {
			twinToken: mockToken,
			feeLedgerCanisterId: 'doked-biaaa-aaaar-qag2a-cai'
		};

		it('should validate with correct data', () => {
			expect(IcCkLinkedAssetsSchema.parse(validData)).toEqual(validData);
		});

		it('should fail with invalid twinToken', () => {
			const invalidData = {
				...validData,
				twinToken: { id: 'not-a-symbol' }
			};

			expect(() => IcCkLinkedAssetsSchema.parse(invalidData)).toThrow();
		});

		it('should fail with invalid feeLedgerCanisterId', () => {
			const invalidData = {
				...validData,
				feeLedgerCanisterId: 123
			};

			expect(() => IcCkLinkedAssetsSchema.parse(invalidData)).toThrow();
		});
	});

	describe('IcCkMetadataSchema', () => {
		const validData = {
			twinToken: mockToken,
			feeLedgerCanisterId: 'doked-biaaa-aaaar-qag2a-cai',
			minterCanisterId: IC_CKBTC_MINTER_CANISTER_ID
		};

		it('should validate with correct data', () => {
			expect(IcCkMetadataSchema.parse(validData)).toEqual(validData);
		});

		it('should fail with missing minterCanisterId', () => {
			const { minterCanisterId: _, ...invalidData } = validData;

			expect(() => IcCkMetadataSchema.parse(invalidData)).toThrow();
		});
	});

	describe('IcInterfaceSchema', () => {
		const validData = {
			...mockCanisters,
			...mockApp
		};

		it('should validate with correct data', () => {
			expect(IcInterfaceSchema.parse(validData)).toEqual(validData);
		});

		it('should validate without Index canister', () => {
			const { indexCanisterId: _, ...restValidData } = validData;

			expect(IcInterfaceSchema.parse(restValidData)).toEqual(restValidData);
		});

		it('should fail with incorrect IcCanisters data', () => {
			const invalidData = {
				...validData,
				ledgerCanisterId: 123
			};

			expect(() => IcInterfaceSchema.parse(invalidData)).toThrow();
		});

		it('should fail with incorrect IcAppMetadataSchema data', () => {
			const invalidData = {
				...validData,
				position: 'first'
			};

			expect(() => IcInterfaceSchema.parse(invalidData)).toThrow();
		});
	});

	describe('IcTokenSchema', () => {
		const validData = {
			...mockToken,
			...mockFee,
			...mockCanisters,
			...mockApp
		};

		it('should validate with all required fields', () => {
			expect(IcTokenSchema.parse(validData)).toEqual(validData);
		});

		it('should fail with invalid token', () => {
			const invalidData = {
				...validData,
				id: 'not-a-symbol'
			};

			expect(() => IcTokenSchema.parse(invalidData)).toThrow();
		});

		it('should fail with invalid fee', () => {
			const invalidData = {
				...validData,
				fee: 1000
			};

			expect(() => IcTokenSchema.parse(invalidData)).toThrow();
		});

		it('should fail with invalid canister', () => {
			const invalidData = {
				...validData,
				ledgerCanisterId: 123
			};

			expect(() => IcTokenSchema.parse(invalidData)).toThrow();
		});

		it('should fail with invalid app data', () => {
			const invalidData = {
				...validData,
				position: 'first'
			};

			expect(() => IcTokenSchema.parse(invalidData)).toThrow();
		});
	});

	describe('IcTokenWithoutIdSchema', () => {
		const { id, ...restToken } = mockToken;

		const validData = {
			...restToken,
			...mockFee,
			...mockCanisters,
			...mockApp
		};

		it('should validate without id field', () => {
			expect(IcTokenWithoutIdSchema.parse(validData)).toEqual(validData);
		});

		it('should fail if id field is present', () => {
			const invalidData = {
				...validData,
				id
			};

			expect(() => IcTokenWithoutIdSchema.parse(invalidData)).toThrow();
		});
	});

	describe('IcCkTokenSchema', () => {
		const mockIcToken = {
			...mockToken,
			...mockFee,
			...mockCanisters,
			...mockApp
		};

		it('should validate without IcCkMetadata', () => {
			const validData = {
				...mockIcToken
			};

			expect(IcCkTokenSchema.parse(validData)).toEqual(validData);
		});

		it('should validate with IcCkMetadata', () => {
			const validData = {
				...mockIcToken,
				twinToken: mockToken,
				minterCanisterId: IC_CKBTC_MINTER_CANISTER_ID
			};

			expect(IcCkTokenSchema.parse(validData)).toEqual(validData);
		});

		it('should validate with partial IcCkMetadata', () => {
			const validData = {
				...mockIcToken,
				twinToken: mockToken
			};

			expect(IcCkTokenSchema.parse(validData)).toEqual(validData);
		});
	});

	describe('IcCkInterfaceSchema', () => {
		const validData = {
			...mockCanisters,
			...mockApp,
			twinToken: mockToken,
			feeLedgerCanisterId: 'doked-biaaa-aaaar-qag2a-cai',
			minterCanisterId: IC_CKBTC_MINTER_CANISTER_ID
		};

		it('should validate with IcInterface and IcCkMetadata fields', () => {
			expect(IcCkInterfaceSchema.parse(validData)).toEqual(validData);
		});

		it('should fail with incorrect IcInterface data', () => {
			const invalidData = {
				...validData,
				ledgerCanisterId: 123
			};

			expect(() => IcCkInterfaceSchema.parse(invalidData)).toThrow();
		});

		it('should fail with incorrect IcCkMetadataSchema data', () => {
			const { minterCanisterId: _, ...invalidData } = validData;

			expect(() => IcCkInterfaceSchema.parse(invalidData)).toThrow();
		});
	});
});
