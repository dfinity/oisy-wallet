import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { POLYGON_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import {
	enrichEthEvmPayableToken,
	getERC681Value,
	validateEthEvmTransfer
} from '$eth/utils/eth-open-crypto-pay.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { ExchangesData } from '$lib/types/exchange';
import type {
	PayableTokenWithConvertedAmount,
	PayableTokenWithFees
} from '$lib/types/open-crypto-pay';
import type { DecodedUrn } from '$lib/types/qr-code';
import type { Token } from '$lib/types/token';
import { certified } from '$tests/mocks/balances.mock';

describe('eth-open-crypto-pay.utils', () => {
	describe('enrichEthEvmPayableToken', () => {
		const mockNativeToken: Token = {
			...ETHEREUM_TOKEN,
			decimals: 18
		};

		const mockErc20Token: PayableTokenWithFees = {
			...USDC_TOKEN,
			amount: '100',
			minFee: 0.0001,
			tokenNetwork: 'Ethereum',
			fee: {
				feeInWei: 21000000000000000n, // 0.021 ETH
				feeData: {
					maxFeePerGas: 12n,
					maxPriorityFeePerGas: 7n
				},
				estimatedGasLimit: 21000n
			}
		};

		const mockNativeEthToken: PayableTokenWithFees = {
			...ETHEREUM_TOKEN,
			amount: '1.5',
			minFee: 0.001,
			tokenNetwork: 'Ethereum',
			fee: {
				feeInWei: 21000000000000000n, // 0.021 ETH
				feeData: {
					maxFeePerGas: 12n,
					maxPriorityFeePerGas: 7n
				},
				estimatedGasLimit: 21000n
			}
		};

		const nativeTokens: Token[] = [mockNativeToken];

		const exchanges: ExchangesData = {
			[ETHEREUM_TOKEN.id]: { usd: 2000, usd_market_cap: 1000000 },
			[USDC_TOKEN.id]: { usd: 1, usd_market_cap: 50000 }
		};

		const balances: CertifiedStoreData<BalancesData> = {
			[ETHEREUM_TOKEN.id]: {
				data: 2000000000000000000n, // 2 ETH
				certified
			},
			[USDC_TOKEN.id]: {
				data: 2000000000n, // 2000 USDC
				certified
			}
		};

		it('should enrich token with USD values when all conditions met', () => {
			const result = enrichEthEvmPayableToken({
				token: mockNativeEthToken,
				nativeTokens,
				exchanges,
				balances
			});

			expect(result).toBeDefined();
			expect(result?.amountInUSD).toBeDefined();
			expect(result?.feeInUSD).toBeDefined();
			expect(result?.sumInUSD).toBeDefined();
		});

		it('should return undefined when token has no fee', () => {
			const tokenWithoutFee = {
				...mockNativeEthToken,
				fee: undefined
			};

			const result = enrichEthEvmPayableToken({
				token: tokenWithoutFee,
				nativeTokens,
				exchanges,
				balances
			});

			expect(result).toBeUndefined();
		});

		it('should return undefined when native token not found', () => {
			const result = enrichEthEvmPayableToken({
				token: mockNativeEthToken,
				nativeTokens: [],
				exchanges,
				balances
			});

			expect(result).toBeUndefined();
		});

		it('should return undefined when native token price missing', () => {
			const exchangesWithoutNative: ExchangesData = {
				[USDC_TOKEN.id]: { usd: 1, usd_market_cap: 50000 }
			};

			const result = enrichEthEvmPayableToken({
				token: mockNativeEthToken,
				nativeTokens,
				exchanges: exchangesWithoutNative,
				balances
			});

			expect(result).toBeUndefined();
		});

		it('should return undefined when token price missing', () => {
			const exchangesWithoutToken: ExchangesData = {
				[ETHEREUM_TOKEN.id]: { usd: 2000, usd_market_cap: 1000000 }
			};

			const result = enrichEthEvmPayableToken({
				token: mockErc20Token,
				nativeTokens,
				exchanges: exchangesWithoutToken,
				balances
			});

			expect(result).toBeUndefined();
		});

		it('should return undefined when balance insufficient', () => {
			const insufficientBalances: CertifiedStoreData<BalancesData> = {
				[ETHEREUM_TOKEN.id]: {
					data: 100000000000000000n, // 0.1 ETH (insufficient)
					certified
				}
			};

			const result = enrichEthEvmPayableToken({
				token: mockNativeEthToken,
				nativeTokens,
				exchanges,
				balances: insufficientBalances
			});

			expect(result).toBeUndefined();
		});

		it('should enrich ERC20 token correctly', () => {
			const result = enrichEthEvmPayableToken({
				token: mockErc20Token,
				nativeTokens,
				exchanges,
				balances
			});

			expect(result).toBeDefined();
			expect(result?.amountInUSD).toBeDefined();
			expect(result?.feeInUSD).toBeDefined();
			expect(result?.sumInUSD).toBeDefined();
		});

		it('should preserve original token properties', () => {
			const result = enrichEthEvmPayableToken({
				token: mockNativeEthToken,
				nativeTokens,
				exchanges,
				balances
			});

			expect(result?.id).toBe(mockNativeEthToken.id);
			expect(result?.symbol).toBe(mockNativeEthToken.symbol);
			expect(result?.amount).toBe(mockNativeEthToken.amount);
			expect(result?.fee).toBe(mockNativeEthToken.fee);
		});

		it('should handle exchanges undefined', () => {
			const result = enrichEthEvmPayableToken({
				token: mockNativeEthToken,
				nativeTokens,
				exchanges: undefined,
				balances
			});

			expect(result).toBeUndefined();
		});

		it('should handle empty balances', () => {
			const result = enrichEthEvmPayableToken({
				token: mockNativeEthToken,
				nativeTokens,
				exchanges,
				balances: {}
			});

			expect(result).toBeUndefined();
		});
	});

	describe('getERC681Value', () => {
		describe('Native transfers (value parameter)', () => {
			it('should extract value from native ETH transfer', () => {
				const uri = 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=660720000000000';
				const result = getERC681Value(uri);

				expect(result).toBe(660720000000000n);
			});

			it('should extract value from BNB transfer', () => {
				const uri = 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@56?value=1457070000000000';
				const result = getERC681Value(uri);

				expect(result).toBe(1457070000000000n);
			});

			it('should extract zero value', () => {
				const uri = 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=0';
				const result = getERC681Value(uri);

				expect(result).toBe(ZERO);
			});

			it('should extract very large value', () => {
				const uri =
					'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=999999999999999999999';
				const result = getERC681Value(uri);

				expect(result).toBe(999999999999999999999n);
			});

			it('should extract value with maximum uint256', () => {
				const maxUint256 =
					'115792089237316195423570985008687907853269984665640564039457584007913129639935';
				const uri = `ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=${maxUint256}`;
				const result = getERC681Value(uri);

				expect(result).toBe(BigInt(maxUint256));
			});
		});

		describe('Scientific notation', () => {
			it('should parse scientific notation with lowercase e', () => {
				const uri = 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=1.23e18';
				const result = getERC681Value(uri);

				expect(result).toBe(1230000000000000000n);
			});

			it('should parse scientific notation with uppercase E', () => {
				const uri = 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=1.23E18';
				const result = getERC681Value(uri);

				expect(result).toBe(1230000000000000000n);
			});

			it('should parse scientific notation - 2.014e18', () => {
				const uri = 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=2.014e18';
				const result = getERC681Value(uri);

				expect(result).toBe(2014000000000000000n);
			});

			it('should parse scientific notation - 1e18 (1 ETH)', () => {
				const uri = 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=1e18';
				const result = getERC681Value(uri);

				expect(result).toBe(1000000000000000000n);
			});

			it('should parse scientific notation - 5e6 (5 USDC)', () => {
				const uri =
					'ethereum:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48@1/transfer?address=0x9C2...&uint256=5e6';
				const result = getERC681Value(uri);

				expect(result).toBe(5000000n);
			});

			it('should parse scientific notation with decimal - 1.5e6', () => {
				const uri = 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=1.5e6';
				const result = getERC681Value(uri);

				expect(result).toBe(1500000n);
			});

			it('should parse scientific notation - for large mount', () => {
				const uri =
					'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=123.123456789012345678e18';
				const result = getERC681Value(uri);

				expect(result).toBe(123123456789012345678n);
			});

			it('should parse maximum precision for ETH (18 decimals)', () => {
				const uri =
					'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=999.999999999999999999e18';
				const result = getERC681Value(uri);

				expect(result).toBe(999999999999999999999n);
			});
		});

		describe('ERC20 transfers (uint256 parameter)', () => {
			const tokenContract = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
			const recipient = '0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC';

			it('should extract uint256 from ERC20 transfer', () => {
				const uri = `ethereum:${tokenContract}@8453/transfer?address=${recipient}&uint256=1251263`;
				const result = getERC681Value(uri);

				expect(result).toBe(1251263n);
			});

			it('should extract uint256 when parameters are in different order', () => {
				const uri = `ethereum:${tokenContract}@8453/transfer?uint256=1251263&address=${recipient}`;
				const result = getERC681Value(uri);

				expect(result).toBe(1251263n);
			});

			it('should extract large uint256', () => {
				const uri = `ethereum:${tokenContract}@8453/transfer?address=${recipient}&uint256=1000000000000000000`;
				const result = getERC681Value(uri);

				expect(result).toBe(1000000000000000000n);
			});

			it('should extract zero uint256', () => {
				const uri = `ethereum:${tokenContract}@8453/transfer?address=${recipient}&uint256=0`;
				const result = getERC681Value(uri);

				expect(result).toBe(ZERO);
			});

			it('should extract uint256 with additional parameters', () => {
				const uri = `ethereum:${tokenContract}@8453/transfer?address=${recipient}&uint256=1251263&gas=21000`;
				const result = getERC681Value(uri);

				expect(result).toBe(1251263n);
			});
		});

		describe('Missing or invalid parameters', () => {
			it('should return undefined when no query string', () => {
				const uri = 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1';
				const result = getERC681Value(uri);

				expect(result).toBeUndefined();
			});

			it('should return undefined when value and uint256 are missing', () => {
				const uri = 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?gas=21000';
				const result = getERC681Value(uri);

				expect(result).toBeUndefined();
			});

			it('should return undefined for empty value', () => {
				const uri = 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=';
				const result = getERC681Value(uri);

				expect(result).toBeUndefined();
			});

			it('should return undefined for empty uint256', () => {
				const uri =
					'ethereum:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913@8453/transfer?address=0x9C2...&uint256=';
				const result = getERC681Value(uri);

				expect(result).toBeUndefined();
			});

			it('should return undefined for invalid URI format', () => {
				const uri = 'not-a-valid-uri';
				const result = getERC681Value(uri);

				expect(result).toBeUndefined();
			});

			it('should return undefined for empty string', () => {
				const uri = '';
				const result = getERC681Value(uri);

				expect(result).toBeUndefined();
			});
		});

		describe('Edge cases', () => {
			it('should handle URI with multiple question marks', () => {
				const uri = 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=1000?extra=param';
				const result = getERC681Value(uri);

				// URLSearchParams treats everything after first ? as query string
				expect(result).toBeDefined();
			});

			it('should handle URI with encoded characters', () => {
				const uri =
					'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=1000&extra=%20space';
				const result = getERC681Value(uri);

				expect(result).toBe(1000n);
			});

			it('should prioritize value over uint256 when both present', () => {
				const uri = 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=1000&uint256=2000';
				const result = getERC681Value(uri);

				expect(result).toBe(1000n);
			});

			it('should handle duplicate value parameters', () => {
				const uri = 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=1000&value=2000';
				const result = getERC681Value(uri);

				// URLSearchParams returns first occurrence
				expect(result).toBe(1000n);
			});

			it('should handle value with leading zeros', () => {
				const uri = 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=00001000';
				const result = getERC681Value(uri);

				expect(result).toBe(1000n);
			});
		});

		describe('Real eth/evm examples', () => {
			it('should extract 1 ETH', () => {
				const uri =
					'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=1000000000000000000';
				const result = getERC681Value(uri);

				expect(result).toBe(1000000000000000000n);
			});

			it('should extract 0.001 ETH', () => {
				const uri = 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=1000000000000000';
				const result = getERC681Value(uri);

				expect(result).toBe(1000000000000000n);
			});

			it('should extract 1 USDC (6 decimals)', () => {
				const uri =
					'ethereum:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48@1/transfer?address=0x9C2...&uint256=1000000';
				const result = getERC681Value(uri);

				expect(result).toBe(1000000n);
			});

			it('should extract 100 USDT (6 decimals)', () => {
				const uri =
					'ethereum:0xdAC17F958D2ee523a2206206994597C13D831ec7@1/transfer?address=0x9C2...&uint256=100000000';
				const result = getERC681Value(uri);

				expect(result).toBe(100000000n);
			});
		});

		describe('Different blockchain networks', () => {
			it('should extract from Ethereum mainnet (chainId 1)', () => {
				const uri = 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=1000';
				const result = getERC681Value(uri);

				expect(result).toBe(1000n);
			});

			it('should extract from BSC (chainId 56)', () => {
				const uri =
					'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@56?value=100000000000000000000';
				const result = getERC681Value(uri);

				expect(result).toBe(100000000000000000000n);
			});
		});
	});

	describe('validateEthEvmTransfer', () => {
		describe('Native Transfers', () => {
			const nativeToken = {
				...ETHEREUM_TOKEN,
				fee: {
					feeData: {
						maxFeePerGas: 50000000000n,
						maxPriorityFeePerGas: 2000000000n
					},
					estimatedGasLimit: 21000n
				}
			} as unknown as PayableTokenWithConvertedAmount;

			it('should validate native transfer successfully', () => {
				const decodedData: DecodedUrn = {
					prefix: 'ethereum',
					destination: '0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC',
					ethereumChainId: '1'
				};

				const result = validateEthEvmTransfer({
					decodedData,
					token: nativeToken,
					amount: 1000000000000000000n,
					uri: 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=1000000000000000000'
				});

				expect(result).toEqual({
					destination: '0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC',
					feeData: {
						maxFeePerGas: 50000000000n,
						maxPriorityFeePerGas: 2000000000n
					},
					estimatedGasLimit: 21000n,
					value: 1000000000000000000n,
					ethereumChainId: 1n
				});
			});

			it('should preserve BigInt types in result', () => {
				const decodedData: DecodedUrn = {
					prefix: 'ethereum',
					destination: '0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC',
					ethereumChainId: '1'
				};

				const result = validateEthEvmTransfer({
					decodedData,
					token: nativeToken,
					amount: 1000000000000000000n,
					uri: 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=1000000000000000000'
				});

				expect(typeof result.feeData.maxFeePerGas).toBe('bigint');
				expect(typeof result.feeData.maxPriorityFeePerGas).toBe('bigint');
				expect(typeof result.estimatedGasLimit).toBe('bigint');
				expect(typeof result.value).toBe('bigint');
				expect(typeof result.ethereumChainId).toBe('bigint');
			});

			it('should validate data with different values', () => {
				const decodedData: DecodedUrn = {
					prefix: 'ethereum',
					destination: '0xcccccccccccccccccccccccccccccccccccccccc',
					ethereumChainId: '137'
				};

				const polygonToken = { ...nativeToken, network: POLYGON_MAINNET_NETWORK };

				const result = validateEthEvmTransfer({
					decodedData,
					amount: 500000000000000000n,
					token: polygonToken,
					uri: 'ethereum:0xcccccccccccccccccccccccccccccccccccccccc@137?value=500000000000000000'
				});

				expect(result.destination).toBe('0xcccccccccccccccccccccccccccccccccccccccc');
				expect(result.ethereumChainId).toBe(137n);
				expect(result.value).toBe(500000000000000000n);
			});

			it('should throw error when URI value is missing', () => {
				const decodedData: DecodedUrn = {
					prefix: 'ethereum',
					destination: '0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC',
					ethereumChainId: '1'
				};

				expect(() =>
					validateEthEvmTransfer({
						decodedData,
						amount: 1000000000000000000n,
						token: nativeToken,
						uri: 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1'
					})
				).toThrowError();
			});

			it('should throw error when URI value cannot be parsed', () => {
				const decodedData: DecodedUrn = {
					prefix: 'ethereum',
					destination: '0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC',
					ethereumChainId: '1'
				};

				expect(() =>
					validateEthEvmTransfer({
						decodedData,
						amount: 1000000000000000000n,
						token: nativeToken,
						uri: 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=invalid'
					})
				).toThrowError();
			});

			it('should throw error when amount does not match URI value', () => {
				const decodedData: DecodedUrn = {
					prefix: 'ethereum',
					destination: '0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC',
					ethereumChainId: '1'
				};

				expect(() =>
					validateEthEvmTransfer({
						decodedData,
						amount: 2000000000000000000n,
						token: nativeToken,
						uri: 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=1000000000000000000'
					})
				).toThrowError();
			});

			it('should throw error when destination is not valid Ethereum address', () => {
				const invalidData: DecodedUrn = {
					prefix: 'ethereum',
					destination: 'not-an-address',
					ethereumChainId: '1'
				};

				expect(() =>
					validateEthEvmTransfer({
						decodedData: invalidData,
						amount: 1000000000000000000n,
						token: nativeToken,
						uri: 'ethereum:not-an-address@1?value=1000000000000000000'
					})
				).toThrowError();
			});

			it('should handle zero value transfers', () => {
				const decodedData: DecodedUrn = {
					prefix: 'ethereum',
					destination: '0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC',
					ethereumChainId: '1'
				};

				const result = validateEthEvmTransfer({
					decodedData,
					amount: ZERO,
					token: nativeToken,
					uri: 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=0'
				});

				expect(result.value).toBe(ZERO);
			});

			it('should handle very large amounts', () => {
				const largeAmount = 999999999999999999999n;

				const decodedData: DecodedUrn = {
					prefix: 'ethereum',
					destination: '0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC',
					ethereumChainId: '1'
				};

				const result = validateEthEvmTransfer({
					decodedData,
					amount: largeAmount,
					token: nativeToken,
					uri: `ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=${largeAmount}`
				});

				expect(result.value).toBe(largeAmount);
			});

			it('should handle mixed case addresses', () => {
				const mixedCaseAddress = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
				const decodedData: DecodedUrn = {
					prefix: 'ethereum',
					destination: mixedCaseAddress,
					ethereumChainId: '1'
				};

				const result = validateEthEvmTransfer({
					decodedData,
					amount: 1000000000000000000n,
					token: nativeToken,
					uri: `ethereum:${mixedCaseAddress}@1?value=1000000000000000000`
				});

				expect(result.destination).toBe(mixedCaseAddress);
			});
		});

		describe('ERC20 Transfers', () => {
			const erc20Token = {
				...USDC_TOKEN,
				fee: {
					feeData: {
						maxFeePerGas: 30000000000n,
						maxPriorityFeePerGas: 1000000000n
					},
					estimatedGasLimit: 65000n
				}
			} as unknown as PayableTokenWithConvertedAmount;

			const recipient = '0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC';
			const tokenContract = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

			it('should validate ERC20 transfer successfully', () => {
				const decodedData: DecodedUrn = {
					prefix: 'ethereum',
					destination: USDC_TOKEN.address,
					ethereumChainId: String(USDC_TOKEN.network.chainId),
					functionName: 'transfer',
					address: recipient
				};

				const result = validateEthEvmTransfer({
					decodedData,
					token: erc20Token,
					amount: 1000000n,
					uri: `ethereum:${USDC_TOKEN.address}@1/transfer?address=${recipient}&uint256=1000000`
				});

				expect(result).toEqual({
					destination: recipient,
					feeData: {
						maxFeePerGas: 30000000000n,
						maxPriorityFeePerGas: 1000000000n
					},
					estimatedGasLimit: 65000n,
					ethereumChainId: USDC_TOKEN.network.chainId,
					value: 1000000n
				});
			});

			it('should validate data with different values', () => {
				const baseToken = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
				const baseUSDC = {
					...erc20Token,
					network: BSC_MAINNET_NETWORK,
					address: baseToken
				};

				const decodedData: DecodedUrn = {
					prefix: 'ethereum',
					destination: baseToken,
					ethereumChainId: '56n',
					functionName: 'transfer',
					address: recipient
				};

				const result = validateEthEvmTransfer({
					decodedData,
					amount: 5000000n,
					token: baseUSDC,
					uri: `ethereum:${baseToken}@56/transfer?address=${recipient}&uint256=5000000`
				});

				expect(result.destination).toBe(recipient);
				expect(result.ethereumChainId).toBe(56n);
				expect(result.value).toBe(5000000n);
			});

			it('should throw error when address (recipient) is missing', () => {
				const invalidData: DecodedUrn = {
					prefix: 'ethereum',
					destination: tokenContract,
					ethereumChainId: '1',
					functionName: 'transfer',
					address: undefined
				};

				expect(() =>
					validateEthEvmTransfer({
						decodedData: invalidData,
						amount: 1000000n,
						token: erc20Token,
						uri: `ethereum:${tokenContract}@1/transfer?address=${recipient}&uint256=1000000`
					})
				).toThrowError();
			});

			it('should throw error when URI uint256 is missing', () => {
				const decodedData: DecodedUrn = {
					prefix: 'ethereum',
					destination: tokenContract,
					ethereumChainId: '1',
					functionName: 'transfer',
					address: recipient
				};

				expect(() =>
					validateEthEvmTransfer({
						decodedData,
						amount: 1000000n,
						token: erc20Token,
						uri: `ethereum:${tokenContract}@1/transfer?address=${recipient}`
					})
				).toThrowError();
			});

			it('should throw error when URI uint256 cannot be parsed', () => {
				const decodedData: DecodedUrn = {
					prefix: 'ethereum',
					destination: tokenContract,
					ethereumChainId: '1',
					functionName: 'transfer',
					address: recipient
				};

				expect(() =>
					validateEthEvmTransfer({
						decodedData,
						amount: 1000000n,
						token: erc20Token,
						uri: `ethereum:${tokenContract}@1/transfer?address=${recipient}&uint256=invalid`
					})
				).toThrowError();
			});

			it('should throw error when token contract mismatch', () => {
				const invalidData: DecodedUrn = {
					prefix: 'ethereum',
					destination: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
					ethereumChainId: '1',
					functionName: 'transfer',
					address: recipient
				};

				expect(() =>
					validateEthEvmTransfer({
						decodedData: invalidData,
						amount: 1000000n,
						token: erc20Token,
						uri: `ethereum:${tokenContract}@1/transfer?address=${recipient}&uint256=1000000`
					})
				).toThrowError();
			});

			it('should throw error when amount does not match URI uint256', () => {
				const decodedData: DecodedUrn = {
					prefix: 'ethereum',
					destination: tokenContract,
					ethereumChainId: '1',
					functionName: 'transfer',
					address: recipient
				};

				expect(() =>
					validateEthEvmTransfer({
						decodedData,
						amount: 2000000n,
						token: erc20Token,
						uri: `ethereum:${tokenContract}@1/transfer?address=${recipient}&uint256=1000000`
					})
				).toThrowError();
			});

			it('should throw error when recipient address is not valid', () => {
				const invalidData: DecodedUrn = {
					prefix: 'ethereum',
					destination: tokenContract,
					ethereumChainId: '1',
					functionName: 'transfer',
					address: 'not-an-address'
				};

				expect(() =>
					validateEthEvmTransfer({
						decodedData: invalidData,
						amount: 1000000n,
						token: erc20Token,
						uri: `ethereum:${tokenContract}@1/transfer?address=not-an-address&uint256=1000000`
					})
				).toThrowError();
			});

			it('should preserve BigInt types', () => {
				const decodedData: DecodedUrn = {
					prefix: 'ethereum',
					destination: USDC_TOKEN.address,
					ethereumChainId: String(USDC_TOKEN.network.chainId),
					functionName: 'transfer',
					address: recipient
				};

				const result = validateEthEvmTransfer({
					decodedData,
					amount: 1000000n,
					token: erc20Token,
					uri: `ethereum:${USDC_TOKEN.address}@1/transfer?address=${recipient}&uint256=1000000`
				});

				expect(typeof result.feeData.maxFeePerGas).toBe('bigint');
				expect(typeof result.feeData.maxPriorityFeePerGas).toBe('bigint');
				expect(typeof result.estimatedGasLimit).toBe('bigint');
				expect(typeof result.value).toBe('bigint');
				expect(typeof result.ethereumChainId).toBe('bigint');
			});

			it('should handle large amounts', () => {
				const largeAmount = 999999999999n;

				const decodedData: DecodedUrn = {
					prefix: 'ethereum',
					destination: USDC_TOKEN.address,
					ethereumChainId: String(USDC_TOKEN.network.chainId),
					functionName: 'transfer',
					address: recipient
				};

				const result = validateEthEvmTransfer({
					decodedData,
					amount: largeAmount,
					token: erc20Token,
					uri: `ethereum:${USDC_TOKEN.address}@1/transfer?address=${recipient}&uint256=${largeAmount}`
				});

				expect(result.value).toBe(largeAmount);
			});

			it('should handle mixed case recipient address', () => {
				const mixedCaseRecipient = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
				const decodedData: DecodedUrn = {
					prefix: 'ethereum',
					destination: USDC_TOKEN.address,
					ethereumChainId: String(USDC_TOKEN.network.chainId),
					functionName: 'transfer',
					address: mixedCaseRecipient
				};

				const result = validateEthEvmTransfer({
					decodedData,
					amount: 1000000n,
					token: erc20Token,
					uri: `ethereum:${USDC_TOKEN.address}@1/transfer?address=${mixedCaseRecipient}&uint256=1000000`
				});

				expect(result.destination).toBe(mixedCaseRecipient);
			});
		});

		describe('Error cases', () => {
			const nativeToken = {
				...ETHEREUM_TOKEN,
				fee: {
					feeData: {
						maxFeePerGas: 50000000000n,
						maxPriorityFeePerGas: 2000000000n
					},
					estimatedGasLimit: 21000n
				}
			} as unknown as PayableTokenWithConvertedAmount;

			it('should throw error when decodedData is undefined', () => {
				expect(() =>
					validateEthEvmTransfer({
						decodedData: undefined,
						token: nativeToken,
						amount: 1000000000000000000n,
						uri: 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=1000000000000000000'
					})
				).toThrowError();
			});

			it('should throw error when fee data is missing', () => {
				const tokenWithoutFee = {
					...nativeToken,
					fee: undefined
				};

				const decodedData: DecodedUrn = {
					prefix: 'ethereum',
					destination: '0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC',
					ethereumChainId: '1'
				};

				expect(() =>
					validateEthEvmTransfer({
						decodedData,
						token: tokenWithoutFee as unknown as PayableTokenWithConvertedAmount,
						amount: 1000000000000000000n,
						uri: 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=1000000000000000000'
					})
				).toThrowError();
			});

			it('should throw error when maxFeePerGas is missing', () => {
				const tokenWithIncompleteFee = {
					...nativeToken,
					fee: {
						feeData: {
							maxPriorityFeePerGas: 2000000000n
						},
						estimatedGasLimit: 21000n
					}
				};

				const decodedData: DecodedUrn = {
					prefix: 'ethereum',
					destination: '0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC',
					ethereumChainId: '1'
				};

				expect(() =>
					validateEthEvmTransfer({
						decodedData,
						token: tokenWithIncompleteFee as unknown as PayableTokenWithConvertedAmount,
						amount: 1000000000000000000n,
						uri: 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=1000000000000000000'
					})
				).toThrowError();
			});

			it('should throw error when estimatedGasLimit is missing', () => {
				const tokenWithIncompleteFee = {
					...nativeToken,
					fee: {
						feeData: {
							maxFeePerGas: 50000000000n,
							maxPriorityFeePerGas: 2000000000n
						},
						estimatedGasLimit: undefined
					}
				};

				const decodedData: DecodedUrn = {
					prefix: 'ethereum',
					destination: '0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC',
					ethereumChainId: '1'
				};

				expect(() =>
					validateEthEvmTransfer({
						decodedData,
						token: tokenWithIncompleteFee as unknown as PayableTokenWithConvertedAmount,
						amount: 1000000000000000000n,
						uri: 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=1000000000000000000'
					})
				).toThrowError();
			});
		});
	});
});
