import type { BitcoinNetwork as SignerBitcoinNetwork } from '$declarations/signer/signer.did';
import {
	IC_CKBTC_INDEX_CANISTER_ID,
	IC_CKBTC_LEDGER_CANISTER_ID,
	IC_CKBTC_MINTER_CANISTER_ID
} from '$env/networks/networks.icrc.env';
import { USDC_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import { Currency } from '$lib/enums/currency';
import {
	JsonTransactionsTextSchema,
	POST_MESSAGE_REQUESTS,
	PostMessageDataErrorSchema,
	PostMessageDataRequestBtcSchema,
	PostMessageDataRequestExchangeTimerSchema,
	PostMessageDataRequestIcCkBTCUpdateBalanceSchema,
	PostMessageDataRequestIcCkSchema,
	PostMessageDataRequestIcrcSchema,
	PostMessageDataRequestIcrcStrictSchema,
	PostMessageDataRequestSchema,
	PostMessageDataResponseAuthSchema,
	PostMessageDataResponseBTCAddressSchema,
	PostMessageDataResponseErrorSchema,
	PostMessageDataResponseExchangeErrorSchema,
	PostMessageDataResponseExchangeSchema,
	PostMessageDataResponseSchema,
	PostMessageDataResponseWalletCleanUpSchema,
	PostMessageDataResponseWalletSchema,
	PostMessageErrorResponseSchema,
	PostMessageJsonDataResponseSchema,
	PostMessageRequestSchema,
	PostMessageResponseSchema,
	PostMessageResponseStatusSchema,
	PostMessageSyncStateSchema,
	PostMessageWalletDataSchema,
	inferPostMessageSchema
} from '$lib/schema/post-message.schema';
import type { BtcAddress } from '$lib/types/address';
import type { CoingeckoSimplePriceResponse } from '$lib/types/coingecko';
import type { CertifiedData } from '$lib/types/store';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import type { BitcoinNetwork } from '@dfinity/ckbtc';
import * as z from 'zod/v4';

describe('post-message.schema', () => {
	describe('PostMessageRequestSchema', () => {
		const validCases = POST_MESSAGE_REQUESTS;

		const invalidCases = [
			'invalidTimer',
			'startTimer',
			'stopWalletTimer',
			123,
			true,
			'stop-IcpWalletTimer',
			undefined,
			null
		];

		it.each(validCases)('should pass for valid enum value %s', (validCase) => {
			expect(PostMessageRequestSchema.parse(validCase)).toBe(validCase);
		});

		it.each(invalidCases)('should throw an error for invalid enum value %s', (invalidCase) => {
			expect(() => PostMessageRequestSchema.parse(invalidCase)).toThrow();
		});
	});

	describe('PostMessageDataRequestSchema', () => {
		it('should reject any data for PostMessageDataRequestSchema', () => {
			expect(() => PostMessageDataRequestSchema.parse('any data')).toThrow();
			expect(() => PostMessageDataRequestSchema.parse(123)).toThrow();
			expect(() => PostMessageDataRequestSchema.parse({})).toThrow();
		});
	});

	describe('PostMessageDataResponseSchema', () => {
		it('should validate an empty object for PostMessageDataResponseSchema', () => {
			expect(PostMessageDataResponseSchema.parse({})).toEqual({});
		});

		it('should throw an error if PostMessageDataResponseSchema receives non-empty object', () => {
			expect(() => PostMessageDataResponseSchema.parse({ someKey: 'value' })).toThrow();
		});
	});

	describe('PostMessageDataRequestExchangeTimerSchema', () => {
		const mockValidErc20Address = '0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c';
		const mockValidIndexCanisterId = IC_CKBTC_INDEX_CANISTER_ID;
		const mockValidSplAddress = USDC_TOKEN.address;

		it('should validate with correct structure for erc20Addresses and icrcCanisterIds', () => {
			const validData = {
				currentCurrency: Currency.USD,
				erc20Addresses: [mockValidErc20Address],
				icrcCanisterIds: [mockValidIndexCanisterId],
				splAddresses: [mockValidSplAddress]
			};

			expect(PostMessageDataRequestExchangeTimerSchema.parse(validData)).toEqual(validData);
		});

		it('should an invalid erc20Addresses given the lack of zod parser for erc20', () => {
			const validData = {
				currentCurrency: Currency.USD,
				erc20Addresses: ['invalid_address', mockValidErc20Address],
				icrcCanisterIds: [mockValidIndexCanisterId],
				splAddresses: [mockValidSplAddress]
			};

			expect(PostMessageDataRequestExchangeTimerSchema.parse(validData)).toEqual(validData);
		});

		it('should throw an error if icrcCanisterIds is not an array of valid CanisterIdTextSchema', () => {
			const invalidData = {
				erc20Addresses: [mockValidErc20Address],
				icrcCanisterIds: ['invalid_canister_id'],
				splAddresses: [mockValidSplAddress]
			};

			expect(() => PostMessageDataRequestExchangeTimerSchema.parse(invalidData)).toThrow();
		});

		it('should throw an error if either field is missing', () => {
			const missingErc20Addresses = {
				icrcCanisterIds: [mockValidIndexCanisterId],
				splAddresses: [mockValidSplAddress]
			};

			const missingIcrcCanisterIds = {
				erc20Addresses: [mockValidErc20Address],
				splAddresses: [mockValidSplAddress]
			};

			const missingSplAddresses = {
				erc20Addresses: [mockValidErc20Address],
				icrcCanisterIds: [mockValidIndexCanisterId]
			};

			expect(() =>
				PostMessageDataRequestExchangeTimerSchema.parse(missingErc20Addresses)
			).toThrow();
			expect(() =>
				PostMessageDataRequestExchangeTimerSchema.parse(missingIcrcCanisterIds)
			).toThrow();
			expect(() => PostMessageDataRequestExchangeTimerSchema.parse(missingSplAddresses)).toThrow();
		});
	});

	describe('PostMessageDataRequestIcrcSchema', () => {
		const mockCanisters = {
			ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID
		};

		const mockEnv = { env: 'mainnet' };

		it('should validate with correct structure for IcCanistersSchema and env field from NetworkSchema', () => {
			const validData = { ...mockCanisters, ...mockEnv };

			expect(PostMessageDataRequestIcrcSchema.parse(validData)).toEqual(validData);
		});

		it('should throw an error if env field is missing', () => {
			const invalidData = { ...mockCanisters };

			expect(() => PostMessageDataRequestIcrcSchema.parse(invalidData)).toThrow();
		});

		it('should throw an error if IcCanistersSchema fields are missing', () => {
			const invalidData = { ...mockEnv };

			expect(() => PostMessageDataRequestIcrcSchema.parse(invalidData)).toThrow();
		});

		it('should throw an error if env field is invalid', () => {
			const invalidData = { ...mockCanisters, env: 'invalid_env' };

			expect(() => PostMessageDataRequestIcrcSchema.parse(invalidData)).toThrow();
		});
	});

	describe('PostMessageDataRequestIcrcStrictSchema', () => {
		const mockCanisters = {
			ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
			indexCanisterId: IC_CKBTC_INDEX_CANISTER_ID
		};

		const mockEnv = { env: 'mainnet' };

		it('should validate with correct structure for IcCanistersSchema and env field from NetworkSchema', () => {
			const validData = { ...mockCanisters, ...mockEnv };

			expect(PostMessageDataRequestIcrcStrictSchema.parse(validData)).toEqual(validData);
		});

		it('should throw an error if env field is missing', () => {
			const invalidData = { ...mockCanisters };

			expect(() => PostMessageDataRequestIcrcStrictSchema.parse(invalidData)).toThrow();
		});

		it('should throw an error if IcCanistersSchema fields are missing', () => {
			const invalidData = { ...mockEnv };

			expect(() => PostMessageDataRequestIcrcStrictSchema.parse(invalidData)).toThrow();
		});

		it('should throw an error if env field is invalid', () => {
			const invalidData = { ...mockCanisters, env: 'invalid_env' };

			expect(() => PostMessageDataRequestIcrcStrictSchema.parse(invalidData)).toThrow();
		});

		it('should throw an error if IcCanistersSchema fields is missing the index', () => {
			const invalidData = { ledgerCanisterId: mockCanisters.ledgerCanisterId, ...mockEnv };

			expect(() => PostMessageDataRequestIcrcStrictSchema.parse(invalidData)).toThrow();
		});
	});

	describe('PostMessageDataRequestIcCkSchema', () => {
		const mockValidMinterCanisterId = { minterCanisterId: IC_CKBTC_MINTER_CANISTER_ID };

		it('should validate when minterCanisterId is present and valid', () => {
			expect(PostMessageDataRequestIcCkSchema.parse(mockValidMinterCanisterId)).toEqual(
				mockValidMinterCanisterId
			);
		});

		it('should validate when minterCanisterId is missing, as it is optional', () => {
			expect(PostMessageDataRequestIcCkSchema.parse({})).toEqual({});
		});

		it('should throw an error if minterCanisterId is invalid', () => {
			const invalidData = { minterCanisterId: 'invalid_canister_id' };

			expect(() => PostMessageDataRequestIcCkSchema.parse(invalidData)).toThrow();
		});
	});

	describe('PostMessageDataRequestIcCkBTCUpdateBalanceSchema', () => {
		const mockValidMinterCanisterId = { minterCanisterId: IC_CKBTC_MINTER_CANISTER_ID };
		const mockValidBitcoinNetwork: BitcoinNetwork = 'mainnet';

		it('should validate with valid minterCanisterId, bitcoinNetwork, and optional btcAddress', () => {
			const validData = {
				...mockValidMinterCanisterId,
				bitcoinNetwork: mockValidBitcoinNetwork,
				btcAddress: mockBtcAddress
			};

			expect(PostMessageDataRequestIcCkBTCUpdateBalanceSchema.parse(validData)).toEqual(validData);
		});

		it('should validate when btcAddress is missing, as it is optional', () => {
			const validData = {
				...mockValidMinterCanisterId,
				bitcoinNetwork: mockValidBitcoinNetwork
			};

			expect(PostMessageDataRequestIcCkBTCUpdateBalanceSchema.parse(validData)).toEqual(validData);
		});

		it('should valid if bitcoinNetwork is invalid due to the lack of zod parser for custom type', () => {
			const validData = {
				...mockValidMinterCanisterId,
				bitcoinNetwork: 'invalid_network',
				btcAddress: mockBtcAddress
			};

			expect(PostMessageDataRequestIcCkBTCUpdateBalanceSchema.parse(validData)).toEqual(validData);
		});

		it('should throw an error if minterCanisterId is invalid', () => {
			const invalidData = {
				minterCanisterId: 'invalid_canister_id',
				bitcoinNetwork: mockValidBitcoinNetwork,
				btcAddress: mockBtcAddress
			};

			expect(() => PostMessageDataRequestIcCkBTCUpdateBalanceSchema.parse(invalidData)).toThrow();
		});
	});

	describe('PostMessageDataRequestBtcSchema', () => {
		const mockValidBtcAddress: CertifiedData<BtcAddress> = {
			data: mockBtcAddress,
			certified: true
		};
		const mockValidBitcoinNetwork: SignerBitcoinNetwork = { mainnet: null };

		it('should validate with correct btcAddress, shouldFetchTransactions, and bitcoinNetwork', () => {
			const validData = {
				btcAddress: mockValidBtcAddress,
				shouldFetchTransactions: true,
				bitcoinNetwork: mockValidBitcoinNetwork
			};

			expect(PostMessageDataRequestBtcSchema.parse(validData)).toEqual(validData);
		});

		it('should validate if btcAddress is invalid due to zod custom schema', () => {
			const validData = {
				btcAddress: 'invalid_address',
				shouldFetchTransactions: true,
				bitcoinNetwork: mockValidBitcoinNetwork
			};

			expect(PostMessageDataRequestBtcSchema.parse(validData)).toEqual(validData);
		});

		it('should throw an error if shouldFetchTransactions is missing', () => {
			const invalidData = {
				btcAddress: mockValidBtcAddress,
				bitcoinNetwork: mockValidBitcoinNetwork
			};

			expect(() => PostMessageDataRequestBtcSchema.parse(invalidData)).toThrow();
		});

		it('should validate if bitcoinNetwork is invalid due to zod custom', () => {
			const validData = {
				btcAddress: mockValidBtcAddress,
				shouldFetchTransactions: true,
				bitcoinNetwork: 'invalid_network'
			};

			expect(PostMessageDataRequestBtcSchema.parse(validData)).toEqual(validData);
		});
	});

	describe('PostMessageResponseStatusSchema', () => {
		const mockValidStatuses = [
			'syncIcWalletStatus',
			'syncBtcWalletStatus',
			'syncBtcStatusesStatus',
			'syncCkMinterInfoStatus',
			'syncCkBTCUpdateBalanceStatus'
		];

		it.each(mockValidStatuses)('should validate for each allowed enum value %s', (status) => {
			expect(PostMessageResponseStatusSchema.parse(status)).toBe(status);
		});

		it('should throw an error for invalid values', () => {
			expect(() => PostMessageResponseStatusSchema.parse('invalidStatus')).toThrow();
			expect(() => PostMessageResponseStatusSchema.parse('')).toThrow();
			expect(() => PostMessageResponseStatusSchema.parse('syncOtherStatus')).toThrow();
		});
	});

	describe('PostMessageResponseSchema', () => {
		const mockValidResponses = [
			'signOutIdleTimer',
			'delegationRemainingTime',
			'syncExchange',
			'syncIcpWallet',
			'syncIcrcWallet',
			'syncDip20Wallet',
			'syncBtcWallet',
			'syncIcpWalletCleanUp',
			'syncIcrcWalletCleanUp',
			'syncDip20WalletCleanUp',
			'syncBtcStatuses',
			'syncCkMinterInfo',
			'syncBtcPendingUtxos',
			'syncCkBTCUpdateOk',
			'syncBtcAddress',
			...PostMessageResponseStatusSchema.options
		];

		it.each(mockValidResponses)('should validate for each allowed enum value %s', (status) => {
			expect(PostMessageResponseSchema.parse(status)).toBe(status);
		});

		it('should throw an error for invalid values', () => {
			expect(() => PostMessageResponseSchema.parse('invalidResponse')).toThrow();
			expect(() => PostMessageResponseSchema.parse('')).toThrow();
			expect(() => PostMessageResponseSchema.parse('someOtherResponse')).toThrow();
		});
	});

	describe('PostMessageDataResponseAuthSchema', () => {
		it('should validate with a valid authRemainingTime as a number', () => {
			const validData = {
				authRemainingTime: 120
			};

			expect(PostMessageDataResponseAuthSchema.parse(validData)).toEqual(validData);
		});

		it('should throw an error if authRemainingTime is missing', () => {
			const invalidData = {};

			expect(() => PostMessageDataResponseAuthSchema.parse(invalidData)).toThrow();
		});

		it('should throw an error if authRemainingTime is not a number', () => {
			const invalidData = {
				authRemainingTime: 'not_a_number'
			};

			expect(() => PostMessageDataResponseAuthSchema.parse(invalidData)).toThrow();
		});
	});

	describe('PostMessageDataResponseExchangeSchema', () => {
		const mockValidPrice: CoingeckoSimplePriceResponse = { ethereum: { usd: 2000 } };

		it('should validate with all valid price fields', () => {
			const validData = {
				currentExchangeRate: {
					exchangeRateToUsd: 1.5,
					currency: Currency.EUR
				},
				currentEthPrice: mockValidPrice,
				currentBtcPrice: mockValidPrice,
				currentErc20Prices: mockValidPrice,
				currentIcpPrice: mockValidPrice,
				currentIcrcPrices: mockValidPrice
			};

			expect(PostMessageDataResponseExchangeSchema.parse(validData)).toEqual(validData);
		});

		it('should validate if a price field has an invalid structure because custom zod schema are used', () => {
			const validData = {
				currentEthPrice: { usd: 'not_a_number' },
				currentBtcPrice: mockValidPrice,
				currentErc20Prices: mockValidPrice,
				currentIcpPrice: mockValidPrice,
				currentIcrcPrices: mockValidPrice
			};

			expect(PostMessageDataResponseExchangeSchema.parse(validData)).toEqual(validData);
		});
	});

	describe('PostMessageDataResponseExchangeErrorSchema', () => {
		it('should validate when err is provided as a string', () => {
			const validData = {
				err: 'An error occurred'
			};

			expect(PostMessageDataResponseExchangeErrorSchema.parse(validData)).toEqual(validData);
		});

		it('should validate when err is missing, as it is optional', () => {
			const validData = {};

			expect(PostMessageDataResponseExchangeErrorSchema.parse(validData)).toEqual(validData);
		});

		it('should throw an error if err is not a string', () => {
			const invalidData = {
				err: 12345 // incorrect type
			};

			expect(() => PostMessageDataResponseExchangeErrorSchema.parse(invalidData)).toThrow();
		});
	});

	describe('JsonTransactionsTextSchema', () => {
		it('should validate a string successfully', () => {
			const validData = JSON.stringify([{ id: 'tx1', amount: 500 }]);

			expect(JsonTransactionsTextSchema.parse(validData)).toEqual(validData);
		});

		it('should fail validation for non-string values', () => {
			const invalidData = 123n;

			expect(() => JsonTransactionsTextSchema.parse(invalidData)).toThrow();
		});
	});

	describe('PostMessageWalletDataSchema', () => {
		const mockValidBalance: CertifiedData<bigint> = {
			data: 1000n,
			certified: true
		};
		const mockValidTransactions = JSON.stringify([{ id: 'tx1', amount: 500 }]);

		it('should validate with a valid balance and newTransactions', () => {
			const validData = {
				balance: mockValidBalance,
				newTransactions: mockValidTransactions
			};

			expect(PostMessageWalletDataSchema.parse(validData)).toEqual(validData);
		});

		it('should validate if newTransactions is missing', () => {
			const validData = {
				balance: mockValidBalance
			};

			expect(PostMessageWalletDataSchema.parse(validData)).toEqual(validData);
		});

		it('should validate if balance is not a bigint because of zod custom', () => {
			const validData = {
				balance: 'not_a_bigint',
				newTransactions: mockValidTransactions
			};

			expect(PostMessageWalletDataSchema.parse(validData)).toEqual(validData);
		});

		it('should validate if newTransactions is not valid JSON because it accepts a string', () => {
			const validData = {
				balance: mockValidBalance,
				newTransactions: 'invalid_json'
			};

			expect(PostMessageWalletDataSchema.parse(validData)).toEqual(validData);
		});
	});

	describe('PostMessageDataResponseWalletSchema', () => {
		const mockValidBalance: CertifiedData<bigint> = {
			data: 1000n,
			certified: true
		};
		const mockValidTransactions = JSON.stringify([{ id: 'tx1', amount: 500 }]);

		it('should validate with a valid balance and newTransactions', () => {
			const validData = {
				wallet: {
					balance: mockValidBalance,
					newTransactions: mockValidTransactions
				}
			};

			expect(PostMessageDataResponseWalletSchema.parse(validData)).toEqual(validData);
		});

		it('should validate if newTransactions is missing', () => {
			const validData = {
				wallet: {
					balance: mockValidBalance
				}
			};

			expect(PostMessageDataResponseWalletSchema.parse(validData)).toEqual(validData);
		});

		it('should validate if balance is not a bigint because of zod custom', () => {
			const validData = {
				wallet: {
					balance: 'not_a_bigint',
					newTransactions: mockValidTransactions
				}
			};

			expect(PostMessageDataResponseWalletSchema.parse(validData)).toEqual(validData);
		});

		it('should validate if newTransactions is not valid JSON because it accepts a string', () => {
			const validData = {
				wallet: {
					balance: mockValidBalance,
					newTransactions: 'invalid_json'
				}
			};

			expect(PostMessageDataResponseWalletSchema.parse(validData)).toEqual(validData);
		});
	});

	describe('PostMessageDataResponseErrorSchema', () => {
		it('should validate when error is provided with any type of value', () => {
			const validData = {
				error: 'An error occurred'
			};

			expect(PostMessageDataResponseErrorSchema.parse(validData)).toEqual(validData);

			const validDataNumber = {
				error: 12345
			};

			expect(PostMessageDataResponseErrorSchema.parse(validDataNumber)).toEqual(validDataNumber);

			const validDataObject = {
				error: { message: 'An error occurred' }
			};

			expect(PostMessageDataResponseErrorSchema.parse(validDataObject)).toEqual(validDataObject);

			const validDataArray = {
				error: ['Error 1', 'Error 2']
			};

			expect(PostMessageDataResponseErrorSchema.parse(validDataArray)).toEqual(validDataArray);
		});

		it('should validate when error is missing, as it’s optional in the base schema', () => {
			const validData = {};

			expect(PostMessageDataResponseErrorSchema.parse(validData)).toEqual(validData);
		});
	});

	describe('PostMessageDataErrorSchema', () => {
		const [validErrorResponseMsg] = PostMessageErrorResponseSchema.options;

		it('should validate when error is provided with any type of value', () => {
			const validData = {
				error: 'An error occurred'
			};

			expect(
				PostMessageDataErrorSchema.parse({ msg: validErrorResponseMsg, data: validData })
			).toEqual({ msg: validErrorResponseMsg, data: validData });

			const validDataNumber = {
				error: 12345
			};

			expect(
				PostMessageDataErrorSchema.parse({ msg: validErrorResponseMsg, data: validDataNumber })
			).toEqual({ msg: validErrorResponseMsg, data: validDataNumber });

			const validDataObject = {
				error: { message: 'An error occurred' }
			};

			expect(
				PostMessageDataErrorSchema.parse({ msg: validErrorResponseMsg, data: validDataObject })
			).toEqual({ msg: validErrorResponseMsg, data: validDataObject });

			const validDataArray = {
				error: ['Error 1', 'Error 2']
			};

			expect(
				PostMessageDataErrorSchema.parse({ msg: validErrorResponseMsg, data: validDataArray })
			).toEqual({ msg: validErrorResponseMsg, data: validDataArray });
		});

		it('should validate when error is missing, as it’s optional in the base schema', () => {
			const validData = {};

			expect(
				PostMessageDataErrorSchema.parse({ msg: validErrorResponseMsg, data: validData })
			).toEqual({ msg: validErrorResponseMsg, data: validData });
		});
	});

	describe('PostMessageDataResponseWalletCleanUpSchema', () => {
		it('should validate when transactionIds is provided as an array of strings', () => {
			const validData = {
				transactionIds: ['tx1', 'tx2', 'tx3']
			};

			expect(PostMessageDataResponseWalletCleanUpSchema.parse(validData)).toEqual(validData);
		});

		it('should throw an error if transactionIds is missing', () => {
			const invalidData = {};

			expect(() => PostMessageDataResponseWalletCleanUpSchema.parse(invalidData)).toThrow();
		});

		it('should throw an error if transactionIds is not an array', () => {
			const invalidData = {
				transactionIds: 'not_an_array'
			};

			expect(() => PostMessageDataResponseWalletCleanUpSchema.parse(invalidData)).toThrow();
		});

		it('should throw an error if transactionIds contains non-string elements', () => {
			const invalidData = {
				transactionIds: ['tx1', 123, 'tx3']
			};

			expect(() => PostMessageDataResponseWalletCleanUpSchema.parse(invalidData)).toThrow();
		});
	});

	describe('PostMessageJsonDataResponseSchema', () => {
		const mockValidJson = JSON.stringify({ key: 'value', number: 123 });

		it('should validate when json is a valid JSON string', () => {
			const validData = {
				json: mockValidJson
			};

			expect(PostMessageJsonDataResponseSchema.parse(validData)).toEqual(validData);
		});

		it('should validate if json is not a valid JSON string because of zod custom schema', () => {
			const validData = {
				json: 'invalid_json'
			};

			expect(PostMessageJsonDataResponseSchema.parse(validData)).toEqual(validData);
		});
	});

	describe('PostMessageSyncStateSchema', () => {
		it('should validate when state is "idle"', () => {
			const validData = {
				state: 'idle'
			};

			expect(PostMessageSyncStateSchema.parse(validData)).toEqual(validData);
		});

		it('should validate when state is "in_progress"', () => {
			const validData = {
				state: 'in_progress'
			};

			expect(PostMessageSyncStateSchema.parse(validData)).toEqual(validData);
		});

		it('should validate when state is "error"', () => {
			const validData = {
				state: 'error'
			};

			expect(PostMessageSyncStateSchema.parse(validData)).toEqual(validData);
		});

		it('should throw an error if state has an invalid value', () => {
			const invalidData = {
				state: 'completed'
			};

			expect(() => PostMessageSyncStateSchema.parse(invalidData)).toThrow();
		});

		it('should throw an error if state is missing', () => {
			const invalidData = {};

			expect(() => PostMessageSyncStateSchema.parse(invalidData)).toThrow();
		});
	});

	describe('PostMessageDataResponseBTCAddressSchema', () => {
		const mockValidBtcAddress: CertifiedData<BtcAddress> = {
			data: mockBtcAddress,
			certified: true
		};

		it('should validate when address is a valid BTC address', () => {
			const validData = {
				address: mockValidBtcAddress
			};

			expect(PostMessageDataResponseBTCAddressSchema.parse(validData)).toEqual(validData);
		});

		it('should validate if address is not of type BtcAddressData because of zod custom type', () => {
			const validData = {
				address: 12345
			};

			expect(PostMessageDataResponseBTCAddressSchema.parse(validData)).toEqual(validData);
		});
	});

	describe('inferPostMessageSchema', () => {
		const CustomDataSchema = z.object({
			additionalInfo: z.string()
		});
		const SchemaWithCustomData = inferPostMessageSchema(CustomDataSchema);

		const [validRequestMsg] = PostMessageRequestSchema.options;
		const [validResponseMsg] = PostMessageResponseSchema.options;
		const validData = { additionalInfo: 'sample info' };

		it('should validate with a valid request msg and data matching dataSchema', () => {
			const validPayload = {
				msg: validRequestMsg,
				data: validData
			};

			expect(SchemaWithCustomData.parse(validPayload)).toEqual(validPayload);
		});

		it('should validate with a valid response msg and data matching dataSchema', () => {
			const validPayload = {
				msg: validResponseMsg,
				data: validData
			};

			expect(SchemaWithCustomData.parse(validPayload)).toEqual(validPayload);
		});

		it('should validate with a valid msg and no data (data is optional)', () => {
			const validPayload = {
				msg: validRequestMsg
			};

			expect(SchemaWithCustomData.parse(validPayload)).toEqual(validPayload);
		});

		it('should validate with a valid error response msg and data matching an error', () => {
			const [validResponseMsg] = PostMessageErrorResponseSchema.options;
			const validData = { error: 'mock-error' };

			const validPayload = {
				msg: validResponseMsg,
				data: validData
			};

			expect(SchemaWithCustomData.parse(validPayload)).toEqual(validPayload);
		});

		it('should validate with a valid error response msg and data matching an optional error', () => {
			const [validResponseMsg] = PostMessageErrorResponseSchema.options;
			const validData = {};

			const validPayload = {
				msg: validResponseMsg,
				data: validData
			};

			expect(SchemaWithCustomData.parse(validPayload)).toEqual(validPayload);
		});

		it('should throw an error if msg is missing', () => {
			const invalidPayload = { data: validData };

			expect(() => SchemaWithCustomData.parse(invalidPayload)).toThrow();
		});

		it('should throw an error if msg is not a valid value from PostMessageRequestSchema or PostMessageResponseSchema', () => {
			const invalidPayload = {
				msg: 'invalid_message',
				data: validData
			};

			expect(() => SchemaWithCustomData.parse(invalidPayload)).toThrow();
		});

		it('should throw an error if data does not match dataSchema', () => {
			const invalidPayload = {
				msg: validRequestMsg,
				data: { additionalInfo: 123 }
			};

			expect(() => SchemaWithCustomData.parse(invalidPayload)).toThrow();
		});
	});
});
