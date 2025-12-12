import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { POLYGON_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ZERO } from '$lib/constants/app.constants';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { ExchangesData } from '$lib/types/exchange';
import type { Network } from '$lib/types/network';
import type {
	Address,
	OpenCryptoPayResponse,
	PayableTokenWithConvertedAmount,
	PayableTokenWithFees,
	PaymentMethodData
} from '$lib/types/open-crypto-pay';
import type { DecodedUrn } from '$lib/types/qr-code';
import type { Token } from '$lib/types/token';
import {
	createPaymentMethodDataMap,
	decodeLNURL,
	enrichTokensWithUsdAndBalance,
	extractQuoteData,
	formatAddress,
	getERC681Value,
	mapTokenToPayableToken,
	prepareBasePayableTokens,
	validateDecodedData,
	validateERC20Transfer,
	validateNativeTransfer
} from '$lib/utils/open-crypto-pay.utils';

describe('open-crypto-pay.utils', () => {
	describe('decodeLNURL', () => {
		const mockLNURL =
			'LNURL1DP68GURN8GHJ7CTSDYHXGENC9EEHW6TNWVHHVVF0D3H82UNVWQHHQMZLVFJK2ERYVG6RZCMYX33RVEPEV5YEJ9WT';

		it('should decode valid LNURL to URL', () => {
			const result = decodeLNURL(mockLNURL);

			expect(result).toBeDefined();
			expect(result).toContain('https://');
			expect(result).toContain('api.dfx.swiss');
		});

		it('should decode LNURL to specific URL format', () => {
			const result = decodeLNURL(mockLNURL);

			expect(() => new URL(result)).not.toThrow();

			const url = new URL(result);

			expect(url.protocol).toBe('https:');
			expect(url.hostname).toContain('dfx.swiss');
		});

		it('should handle uppercase LNURL', () => {
			const result = decodeLNURL(mockLNURL.toLowerCase());

			expect(result).toBeDefined();
			expect(result).toContain('https://');
		});

		it('should throw error for invalid LNURL format', () => {
			const invalidLnurl = 'invalid-lnurl-string';

			expect(() => decodeLNURL(invalidLnurl)).toThrow();
		});

		it('should throw error for empty string', () => {
			expect(() => decodeLNURL('')).toThrow();
		});

		it('should throw error for non-lnurl prefix', () => {
			// Valid bech32 but wrong prefix
			const btcAddress = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';

			expect(() => decodeLNURL(btcAddress)).toThrow();
		});

		it('should throw error for corrupted LNURL', () => {
			// LNURL with some characters removed
			const corruptedLnurl = 'lnurl1dp68gurn8ghj7ctsdyh8gct5wvhxxmmd';

			expect(() => decodeLNURL(corruptedLnurl)).toThrow();
		});

		it('should decode and return valid UTF-8 string', () => {
			const result = decodeLNURL(mockLNURL);

			// Should not contain invalid UTF-8 characters
			expect(result).toMatch(/^[\x20-\x7E]+$/);
		});
	});

	describe('formatAddress', () => {
		it('should format complete address correctly', () => {
			const address: Address = {
				street: 'Bahnhofstrasse',
				houseNumber: '7',
				zip: '6300',
				city: 'Zug',
				country: 'CH'
			};

			expect(formatAddress(address)).toBe('Bahnhofstrasse 7, 6300 Zug');
		});

		it('should format address without country', () => {
			const address: Address = {
				street: 'Bahnhofstrasse',
				houseNumber: '7',
				zip: '6300',
				city: 'Zug'
			};

			expect(formatAddress(address)).toBe('Bahnhofstrasse 7, 6300 Zug');
		});

		it('should format address with only street', () => {
			const address: Address = {
				street: 'Main Street'
			};

			expect(formatAddress(address)).toBe('Main Street');
		});

		it('should format address with only city', () => {
			const address: Address = {
				city: 'Zurich'
			};

			expect(formatAddress(address)).toBe('Zurich');
		});

		it('should format address with zip and city', () => {
			const address: Address = {
				zip: '6300',
				city: 'Zug'
			};

			expect(formatAddress(address)).toBe('6300 Zug');
		});

		it('should format address without zip', () => {
			const address: Address = {
				street: 'Bahnhofstrasse',
				houseNumber: '7',
				city: 'Zug',
				country: 'CH'
			};

			expect(formatAddress(address)).toBe('Bahnhofstrasse 7, Zug');
		});

		it('should format address without house number', () => {
			const address: Address = {
				street: 'Bahnhofstrasse',
				zip: '6300',
				city: 'Zug'
			};

			expect(formatAddress(address)).toBe('Bahnhofstrasse, 6300 Zug');
		});

		it('should format address with only house number', () => {
			const address: Address = {
				houseNumber: '7'
			};

			expect(formatAddress(address)).toBe('7');
		});

		it('should format address with only zip', () => {
			const address: Address = {
				zip: '6300'
			};

			expect(formatAddress(address)).toBe('6300');
		});

		it('should format street and country without city', () => {
			const address: Address = {
				street: 'Main Street',
				country: 'USA'
			};

			expect(formatAddress(address)).toBe('Main Street');
		});

		it('should format street with house number and zip without city', () => {
			const address: Address = {
				street: 'Street',
				houseNumber: '10',
				zip: '12345'
			};

			expect(formatAddress(address)).toBe('Street 10, 12345');
		});

		it('should format house number with city without street', () => {
			const address: Address = {
				houseNumber: '7',
				city: 'City'
			};

			expect(formatAddress(address)).toBe('7, City');
		});

		it('should format all middle combinations', () => {
			expect(
				formatAddress({
					street: 'Street',
					city: 'City',
					country: 'Country'
				})
			).toBe('Street, City');

			expect(
				formatAddress({
					houseNumber: '5',
					zip: '1234',
					country: 'CH'
				})
			).toBe('5, 1234');

			expect(
				formatAddress({
					street: 'Street',
					houseNumber: '5',
					country: 'CH'
				})
			).toBe('Street 5');
		});

		it('should return fallback for undefined address', () => {
			expect(formatAddress(undefined)).toBe('-');
		});

		it('should return fallback for null address', () => {
			expect(formatAddress(null as unknown as Address)).toBe('-');
		});

		it('should return fallback for empty address object', () => {
			const address: Address = {};

			expect(formatAddress(address)).toBe('-');
		});

		it('should handle address with empty string values', () => {
			const address: Address = {
				street: '',
				houseNumber: '',
				zip: '',
				city: '',
				country: ''
			};

			expect(formatAddress(address)).toBe('-');
		});

		it('should filter out empty strings and keep valid values', () => {
			const address: Address = {
				street: '',
				houseNumber: '7',
				zip: '',
				city: 'Zug',
				country: ''
			};

			expect(formatAddress(address)).toBe('7, Zug');
		});

		it('should handle mixed empty and valid values', () => {
			const address: Address = {
				street: 'Street',
				houseNumber: '',
				zip: '1234',
				city: '',
				country: 'CH'
			};

			expect(formatAddress(address)).toBe('Street, 1234');
		});
	});

	describe('createPaymentMethodDataMap', () => {
		const mockNetworks: Network[] = [
			{
				name: 'Ethereum',
				pay: { openCryptoPay: 'Ethereum' }
			},
			{
				name: 'Polygon',
				pay: { openCryptoPay: 'Polygon' }
			},
			{
				name: 'BscMainnet',
				pay: { openCryptoPay: 'BinanceSmartChain' }
			},
			{
				name: 'Bitcoin'
			},
			{
				name: 'Arbitrum',
				pay: {}
			}
		] as Network[];

		const mockTransferAmounts = [
			{
				method: 'Ethereum',
				available: true,
				minFee: 0.001,
				assets: [
					{ asset: 'ETH', amount: '100' },
					{ asset: 'USDT', amount: '1000' }
				]
			},
			{
				method: 'Polygon',
				available: true,
				minFee: 0.001,
				assets: [{ asset: 'MATIC', amount: '500' }]
			},
			{
				method: 'BinanceSmartChain',
				available: true,
				minFee: 0.002,
				assets: [{ asset: 'BNB', amount: '50' }]
			},
			{
				method: 'Bitcoin',
				available: false,
				minFee: 0.0005,
				assets: [{ asset: 'BTC', amount: '10' }]
			},
			{
				method: 'Solana',
				available: true,
				minFee: 0.001,
				assets: []
			},
			{
				method: 'Avalanche',
				available: true,
				minFee: 0.001,
				assets: [{ asset: 'AVAX', amount: '100' }]
			}
		];

		it('should create empty map for empty transfer amounts', () => {
			const result = createPaymentMethodDataMap({
				transferAmounts: [],
				networks: mockNetworks
			});

			expect(result).toBeInstanceOf(Map);
			expect(result.size).toBe(0);
		});

		it('should create empty map for empty networks', () => {
			const result = createPaymentMethodDataMap({
				transferAmounts: mockTransferAmounts,
				networks: []
			});

			expect(result.size).toBe(0);
		});

		it('should filter and create map for supported methods only', () => {
			const result = createPaymentMethodDataMap({
				transferAmounts: mockTransferAmounts,
				networks: mockNetworks
			});

			expect(result.size).toBe(3);
			expect(result.has('Ethereum')).toBeTruthy();
			expect(result.has('Polygon')).toBeTruthy();
			expect(result.has('BinanceSmartChain')).toBeTruthy();
			expect(result.has('Bitcoin')).toBeFalsy();
			expect(result.has('Solana')).toBeFalsy();
			expect(result.has('Avalanche')).toBeFalsy();
		});

		it('should correctly map assets for each method', () => {
			const result = createPaymentMethodDataMap({
				transferAmounts: mockTransferAmounts,
				networks: mockNetworks
			});

			const ethereumData = result.get('Ethereum');

			expect(ethereumData?.assets.size).toBe(2);
			expect(ethereumData?.assets.get('ETH')).toEqual({ amount: '100' });
			expect(ethereumData?.assets.get('USDT')).toEqual({ amount: '1000' });

			const polygonData = result.get('Polygon');

			expect(polygonData?.assets.size).toBe(1);
			expect(polygonData?.assets.get('MATIC')).toEqual({ amount: '500' });

			const bscData = result.get('BinanceSmartChain');

			expect(bscData?.assets.size).toBe(1);
			expect(bscData?.assets.get('BNB')).toEqual({ amount: '50' });
		});

		it('should preserve minFee values', () => {
			const result = createPaymentMethodDataMap({
				transferAmounts: mockTransferAmounts,
				networks: mockNetworks
			});

			expect(result.get('Ethereum')?.minFee).toBe(0.001);
			expect(result.get('Polygon')?.minFee).toBe(0.001);
			expect(result.get('BinanceSmartChain')?.minFee).toBe(0.002);
		});

		it('should filter out methods not available', () => {
			const result = createPaymentMethodDataMap({
				transferAmounts: mockTransferAmounts,
				networks: [
					...mockNetworks,
					{ name: 'Bitcoin', pay: { openCryptoPay: 'Bitcoin' } }
				] as Network[]
			});

			expect(result.has('Bitcoin')).toBeFalsy();
		});

		it('should filter out methods with empty assets', () => {
			const result = createPaymentMethodDataMap({
				transferAmounts: mockTransferAmounts,
				networks: [
					...mockNetworks,
					{ name: 'Solana', pay: { openCryptoPay: 'Solana' } }
				] as Network[]
			});

			expect(result.has('Solana')).toBeFalsy();
		});

		it('should filter out methods not supported by networks', () => {
			const result = createPaymentMethodDataMap({
				transferAmounts: mockTransferAmounts,
				networks: [{ name: 'Ethereum', pay: { openCryptoPay: 'Ethereum' } }] as Network[]
			});

			expect(result.size).toBe(1);
			expect(result.has('Ethereum')).toBeTruthy();
			expect(result.has('Polygon')).toBeFalsy();
			expect(result.has('BinanceSmartChain')).toBeFalsy();
		});

		it('should handle single asset per method', () => {
			const singleAssetTransfer = [
				{
					method: 'Polygon',
					available: true,
					minFee: 0.0001,
					assets: [{ asset: 'MATIC', amount: '500' }]
				}
			];

			const result = createPaymentMethodDataMap({
				transferAmounts: singleAssetTransfer,
				networks: mockNetworks
			});

			expect(result.size).toBe(1);

			const polygonData = result.get('Polygon');

			expect(polygonData?.assets.size).toBe(1);
			expect(polygonData?.assets.get('MATIC')).toEqual({ amount: '500' });
		});

		it('should return new Map instance each time', () => {
			const result1 = createPaymentMethodDataMap({
				transferAmounts: mockTransferAmounts,
				networks: mockNetworks
			});
			const result2 = createPaymentMethodDataMap({
				transferAmounts: mockTransferAmounts,
				networks: mockNetworks
			});

			expect(result1).not.toBe(result2);
		});

		it('should handle method with zero minFee', () => {
			const zeroFeeTransfer = [
				{
					method: 'Polygon',
					available: true,
					minFee: 0,
					assets: [{ asset: 'MATIC', amount: '100' }]
				}
			];

			const result = createPaymentMethodDataMap({
				transferAmounts: zeroFeeTransfer,
				networks: mockNetworks
			});

			const polygonData = result.get('Polygon');

			expect(polygonData?.minFee).toBe(0);
		});

		it('should handle multiple assets for same method', () => {
			const multiAssetTransfer = [
				{
					method: 'Ethereum',
					available: true,
					minFee: 0.001,
					assets: [
						{ asset: 'ETH', amount: '100' },
						{ asset: 'USDT', amount: '1000' },
						{ asset: 'USDC', amount: '2000' },
						{ asset: 'DAI', amount: '1500' }
					]
				}
			];

			const result = createPaymentMethodDataMap({
				transferAmounts: multiAssetTransfer,
				networks: mockNetworks
			});

			const ethereumData = result.get('Ethereum');

			expect(ethereumData?.assets.size).toBe(4);
			expect(ethereumData?.assets.get('ETH')).toEqual({ amount: '100' });
			expect(ethereumData?.assets.get('USDT')).toEqual({ amount: '1000' });
			expect(ethereumData?.assets.get('USDC')).toEqual({ amount: '2000' });
			expect(ethereumData?.assets.get('DAI')).toEqual({ amount: '1500' });
		});
	});

	describe('mapTokenToPayableToken', () => {
		const mockMethodDataMap = new Map<string, PaymentMethodData>([
			[
				'Ethereum',
				{
					minFee: 0.001,
					assets: new Map([
						['ETH', { amount: '100' }],
						['USDT', { amount: '1000' }],
						['USDC', { amount: '2000' }]
					])
				}
			],
			[
				'Polygon',
				{
					minFee: 0.0001,
					assets: new Map([
						['MATIC', { amount: '500' }],
						['USDT', { amount: '800' }]
					])
				}
			],
			[
				'BinanceSmartChain',
				{
					minFee: 0.0002,
					assets: new Map([['BNB', { amount: '50' }]])
				}
			]
		]);

		const createMockToken = (overrides?: Partial<Token>): Token =>
			({
				id: 'token-1',
				symbol: 'ETH',
				name: 'Ethereum',
				decimals: 18,
				network: {
					id: 'ethereum',
					name: 'Ethereum',
					pay: {
						openCryptoPay: 'Ethereum'
					}
				},
				...overrides
			}) as Token;

		it('should map token with all valid data', () => {
			const token = createMockToken();

			const result = mapTokenToPayableToken({
				token,
				methodDataMap: mockMethodDataMap
			});

			expect(result).toBeDefined();
			expect(result?.symbol).toBe('ETH');
			expect(result?.amount).toBe('100');
			expect(result?.tokenNetwork).toBe('Ethereum');
			expect(result?.minFee).toBe(0.001);
			expect(result?.id).toBe('token-1');
			expect(result?.name).toBe('Ethereum');
		});

		it('should map token with different symbol', () => {
			const token = createMockToken({
				symbol: 'USDT'
			});

			const result = mapTokenToPayableToken({
				token,
				methodDataMap: mockMethodDataMap
			});

			expect(result).toBeDefined();
			expect(result?.symbol).toBe('USDT');
			expect(result?.amount).toBe('1000');
			expect(result?.tokenNetwork).toBe('Ethereum');
			expect(result?.minFee).toBe(0.001);
		});

		it('should map token from different network', () => {
			const token = createMockToken({
				symbol: 'MATIC',
				network: {
					id: 'polygon',
					name: 'Polygon',
					pay: {
						openCryptoPay: 'Polygon'
					}
				} as unknown as Network
			});

			const result = mapTokenToPayableToken({
				token,
				methodDataMap: mockMethodDataMap
			});

			expect(result).toBeDefined();
			expect(result?.symbol).toBe('MATIC');
			expect(result?.amount).toBe('500');
			expect(result?.tokenNetwork).toBe('Polygon');
			expect(result?.minFee).toBe(0.0001);
		});

		it('should return undefined when network has no pay property', () => {
			const token = createMockToken({
				network: {
					id: 'bitcoin',
					name: 'Bitcoin'
				} as unknown as Network
			});

			const result = mapTokenToPayableToken({
				token,
				methodDataMap: mockMethodDataMap
			});

			expect(result).toBeUndefined();
		});

		it('should return undefined when network.pay has no openCryptoPay', () => {
			const token = createMockToken({
				network: {
					id: 'arbitrum',
					name: 'Arbitrum',
					pay: {}
				} as unknown as Network
			});

			const result = mapTokenToPayableToken({
				token,
				methodDataMap: mockMethodDataMap
			});

			expect(result).toBeUndefined();
		});

		it('should return undefined when network.pay.openCryptoPay is null', () => {
			const token = createMockToken({
				network: {
					id: 'solana',
					name: 'Solana',
					pay: {
						openCryptoPay: null
					}
				} as unknown as Network
			});

			const result = mapTokenToPayableToken({
				token,
				methodDataMap: mockMethodDataMap
			});

			expect(result).toBeUndefined();
		});

		it('should return undefined when network.pay.openCryptoPay is undefined', () => {
			const token = createMockToken({
				network: {
					id: 'avalanche',
					name: 'Avalanche',
					pay: {
						openCryptoPay: undefined
					}
				} as unknown as Network
			});

			const result = mapTokenToPayableToken({
				token,
				methodDataMap: mockMethodDataMap
			});

			expect(result).toBeUndefined();
		});

		it('should return undefined when methodDataMap does not have network', () => {
			const token = createMockToken({
				network: {
					id: 'solana',
					name: 'Solana',
					pay: {
						openCryptoPay: 'Solana'
					}
				} as unknown as Network
			});

			const result = mapTokenToPayableToken({
				token,
				methodDataMap: mockMethodDataMap
			});

			expect(result).toBeUndefined();
		});

		it('should return undefined when asset is not in methodData', () => {
			const token = createMockToken({
				symbol: 'DAI'
			});

			const result = mapTokenToPayableToken({
				token,
				methodDataMap: mockMethodDataMap
			});

			expect(result).toBeUndefined();
		});

		it('should return undefined when methodDataMap is empty', () => {
			const token = createMockToken();

			const result = mapTokenToPayableToken({
				token,
				methodDataMap: new Map()
			});

			expect(result).toBeUndefined();
		});

		it('should handle token with zero amount', () => {
			const customMethodDataMap = new Map<string, PaymentMethodData>([
				[
					'Ethereum',
					{
						minFee: 0.001,
						assets: new Map([['ETH', { amount: '0' }]])
					}
				]
			]);

			const token = createMockToken();

			const result = mapTokenToPayableToken({
				token,
				methodDataMap: customMethodDataMap
			});

			expect(result).toBeDefined();
			expect(result?.amount).toBe('0');
		});

		it('should handle same symbol on different networks', () => {
			const ethToken = createMockToken({
				symbol: 'USDT',
				network: {
					id: 'ethereum',
					name: 'Ethereum',
					pay: { openCryptoPay: 'Ethereum' }
				} as unknown as Network
			});

			const ethResult = mapTokenToPayableToken({
				token: ethToken,
				methodDataMap: mockMethodDataMap
			});

			expect(ethResult?.amount).toBe('1000');
			expect(ethResult?.tokenNetwork).toBe('Ethereum');

			const polyToken = createMockToken({
				symbol: 'USDT',
				network: {
					id: 'polygon',
					name: 'Polygon',
					pay: { openCryptoPay: 'Polygon' }
				} as unknown as Network
			});

			const polyResult = mapTokenToPayableToken({
				token: polyToken,
				methodDataMap: mockMethodDataMap
			});

			expect(polyResult?.amount).toBe('800');
			expect(polyResult?.tokenNetwork).toBe('Polygon');
		});
	});

	describe('prepareBasePayableTokens', () => {
		const mockTransferAmounts = [
			{
				method: 'Ethereum',
				available: true,
				minFee: 0.001,
				assets: [
					{ asset: 'ETH', amount: '100' },
					{ asset: 'USDT', amount: '1000' }
				]
			},
			{
				method: 'Polygon',
				available: true,
				minFee: 0.0001,
				assets: [
					{ asset: 'MATIC', amount: '500' },
					{ asset: 'USDC', amount: '2000' }
				]
			},
			{
				method: 'BinanceSmartChain',
				available: true,
				minFee: 0.0002,
				assets: [{ asset: 'BNB', amount: '50' }]
			}
		];

		const mockNetworks: Network[] = [
			{
				id: 'ethereum',
				name: 'Ethereum',
				pay: { openCryptoPay: 'Ethereum' }
			} as unknown as Network,
			{
				id: 'polygon',
				name: 'Polygon',
				pay: { openCryptoPay: 'Polygon' }
			} as unknown as Network,
			{
				id: 'bsc',
				name: 'BscMainnet',
				pay: { openCryptoPay: 'BinanceSmartChain' }
			} as unknown as Network
		];

		const mockAvailableTokens: Token[] = [
			{
				id: 'eth-token',
				symbol: 'ETH',
				name: 'Ethereum',
				decimals: 18,
				network: mockNetworks[0]
			} as unknown as Token,
			{
				id: 'usdt-token',
				symbol: 'USDT',
				name: 'Tether',
				decimals: 6,
				network: mockNetworks[0]
			} as unknown as Token,
			{
				id: 'matic-token',
				symbol: 'MATIC',
				name: 'Polygon',
				decimals: 18,
				network: mockNetworks[1]
			} as unknown as Token,
			{
				id: 'bnb-token',
				symbol: 'BNB',
				name: 'BNB',
				decimals: 18,
				network: mockNetworks[2]
			} as unknown as Token
		];

		it('should return empty array when transferAmounts is empty', () => {
			const result = prepareBasePayableTokens({
				transferAmounts: [],
				networks: mockNetworks,
				availableTokens: mockAvailableTokens
			});

			expect(result).toEqual([]);
		});

		it('should return empty array when networks is empty', () => {
			const result = prepareBasePayableTokens({
				transferAmounts: mockTransferAmounts,
				networks: [],
				availableTokens: mockAvailableTokens
			});

			expect(result).toEqual([]);
		});

		it('should return empty array when availableTokens is empty', () => {
			const result = prepareBasePayableTokens({
				transferAmounts: mockTransferAmounts,
				networks: mockNetworks,
				availableTokens: []
			});

			expect(result).toEqual([]);
		});

		it('should return empty array when all parameters are empty', () => {
			const result = prepareBasePayableTokens({
				transferAmounts: [],
				networks: [],
				availableTokens: []
			});

			expect(result).toEqual([]);
		});

		it('should prepare all valid payable tokens', () => {
			const result = prepareBasePayableTokens({
				transferAmounts: mockTransferAmounts,
				networks: mockNetworks,
				availableTokens: mockAvailableTokens
			});

			expect(result).toHaveLength(4);

			// ETH token
			expect(result[0].id).toBe('eth-token');
			expect(result[0].symbol).toBe('ETH');
			expect(result[0].amount).toBe('100');
			expect(result[0].tokenNetwork).toBe('Ethereum');
			expect(result[0].minFee).toBe(0.001);

			// USDT token
			expect(result[1].id).toBe('usdt-token');
			expect(result[1].symbol).toBe('USDT');
			expect(result[1].amount).toBe('1000');
			expect(result[1].tokenNetwork).toBe('Ethereum');
			expect(result[1].minFee).toBe(0.001);

			// MATIC token
			expect(result[2].id).toBe('matic-token');
			expect(result[2].symbol).toBe('MATIC');
			expect(result[2].amount).toBe('500');
			expect(result[2].tokenNetwork).toBe('Polygon');
			expect(result[2].minFee).toBe(0.0001);

			// BNB token
			expect(result[3].id).toBe('bnb-token');
			expect(result[3].symbol).toBe('BNB');
			expect(result[3].amount).toBe('50');
			expect(result[3].tokenNetwork).toBe('BinanceSmartChain');
			expect(result[3].minFee).toBe(0.0002);
		});

		it('should filter out tokens without matching transfer method', () => {
			const tokensWithUnsupported: Token[] = [
				...mockAvailableTokens,
				{
					id: 'sol-token',
					symbol: 'SOL',
					name: 'Solana',
					decimals: 9,
					network: {
						id: 'solana',
						name: 'Solana',
						pay: { openCryptoPay: 'Solana' }
					} as unknown as Network
				} as unknown as Token
			];

			const result = prepareBasePayableTokens({
				transferAmounts: mockTransferAmounts,
				networks: [
					...mockNetworks,
					{
						id: 'solana',
						name: 'Solana',
						pay: { openCryptoPay: 'Solana' }
					} as unknown as Network
				],
				availableTokens: tokensWithUnsupported
			});

			expect(result).toHaveLength(4);
			expect(result.find((t) => t.symbol === 'SOL')).toBeUndefined();
		});

		it('should filter out tokens without matching asset in transfer', () => {
			const tokensWithMissingAsset: Token[] = [
				...mockAvailableTokens,
				{
					id: 'dai-token',
					symbol: 'DAI',
					name: 'DAI',
					decimals: 18,
					network: mockNetworks[0]
				} as unknown as Token
			];

			const result = prepareBasePayableTokens({
				transferAmounts: mockTransferAmounts,
				networks: mockNetworks,
				availableTokens: tokensWithMissingAsset
			});

			expect(result).toHaveLength(4);
			expect(result.find((t) => t.symbol === 'DAI')).toBeUndefined();
		});

		it('should handle single token', () => {
			const result = prepareBasePayableTokens({
				transferAmounts: mockTransferAmounts,
				networks: mockNetworks,
				availableTokens: [mockAvailableTokens[0]]
			});

			expect(result).toHaveLength(1);
			expect(result[0].symbol).toBe('ETH');
		});

		it('should handle single transfer method', () => {
			const result = prepareBasePayableTokens({
				transferAmounts: [mockTransferAmounts[0]],
				networks: mockNetworks,
				availableTokens: mockAvailableTokens
			});

			expect(result).toHaveLength(2);
			expect(result[0].symbol).toBe('ETH');
			expect(result[1].symbol).toBe('USDT');
		});

		it('should filter unavailable transfer methods', () => {
			const transferWithUnavailable = [
				...mockTransferAmounts,
				{
					method: 'Avalanche',
					available: false,
					minFee: 0.0003,
					assets: [{ asset: 'AVAX', amount: '100' }]
				}
			];

			const result = prepareBasePayableTokens({
				transferAmounts: transferWithUnavailable,
				networks: mockNetworks,
				availableTokens: mockAvailableTokens
			});

			expect(result).toHaveLength(4);
		});

		it('should return new array instance', () => {
			const result1 = prepareBasePayableTokens({
				transferAmounts: mockTransferAmounts,
				networks: mockNetworks,
				availableTokens: mockAvailableTokens
			});

			const result2 = prepareBasePayableTokens({
				transferAmounts: mockTransferAmounts,
				networks: mockNetworks,
				availableTokens: mockAvailableTokens
			});

			expect(result1).not.toBe(result2);
			expect(result1).toEqual(result2);
		});
	});

	describe('enrichTokensWithUsdAndBalance', () => {
		const mockNativeToken: Token = ETHEREUM_TOKEN;

		const mockToken1: PayableTokenWithFees = {
			...ETHEREUM_TOKEN,
			amount: '1.5',
			minFee: 0.001,
			tokenNetwork: 'Ethereum',
			fee: {
				feeInWei: 21000000000000000n,
				feeData: {
					maxFeePerGas: 12n,
					maxPriorityFeePerGas: 7n
				},
				estimatedGasLimit: 21000n
			}
		};

		const mockToken2: PayableTokenWithFees = {
			...USDC_TOKEN,
			amount: '100',
			minFee: 0.0001,
			tokenNetwork: 'Ethereum',
			fee: {
				feeInWei: 21000000000000000n,
				feeData: {
					gasPrice: null,
					maxFeePerGas: 12n,
					maxPriorityFeePerGas: 7n
				},
				estimatedGasLimit: 21000n
			}
		} as PayableTokenWithFees;

		const nativeTokens: Token[] = [mockNativeToken];

		const exchanges: ExchangesData = {
			[ETHEREUM_TOKEN.id]: { usd: 2000, usd_market_cap: 1000000 },
			[USDC_TOKEN.id]: { usd: 1, usd_market_cap: 50000 }
		};

		const balances: CertifiedStoreData<BalancesData> = {
			[ETHEREUM_TOKEN.id]: {
				data: 2000000000000000000n
			},
			[USDC_TOKEN.id]: {
				data: 200000000n
			}
		} as unknown as CertifiedStoreData<BalancesData>;

		it('should return empty array for empty tokens array', () => {
			const result = enrichTokensWithUsdAndBalance({
				tokens: [],
				nativeTokens,
				exchanges,
				balances
			});

			expect(result).toEqual([]);
		});

		it('should enrich multiple tokens successfully', () => {
			const result = enrichTokensWithUsdAndBalance({
				tokens: [mockToken1, mockToken2],
				nativeTokens,
				exchanges,
				balances
			});

			expect(result).toHaveLength(2);

			expect(result[0].id).toBe(mockToken1.id);
			expect(result[0].amountInUSD).toBeDefined();
			expect(result[0].feeInUSD).toBeDefined();
			expect(result[0].sumInUSD).toBeDefined();

			expect(result[1].id).toBe(mockToken2.id);
			expect(result[1].amountInUSD).toBeDefined();
			expect(result[1].feeInUSD).toBeDefined();
			expect(result[1].sumInUSD).toBeDefined();
		});

		it('should filter out tokens with insufficient balance', () => {
			const insufficientBalances: CertifiedStoreData<BalancesData> = {
				[ETHEREUM_TOKEN.id]: {
					data: 1000000000000000n
				},
				[USDC_TOKEN.id]: {
					data: 1000000n
				}
			} as unknown as CertifiedStoreData<BalancesData>;

			const result = enrichTokensWithUsdAndBalance({
				tokens: [mockToken1, mockToken2],
				nativeTokens,
				exchanges,
				balances: insufficientBalances
			});

			expect(result).toEqual([]);
		});

		it('should filter out tokens without fee', () => {
			const tokenWithoutFee = {
				...mockToken1,
				fee: undefined
			};

			const result = enrichTokensWithUsdAndBalance({
				tokens: [tokenWithoutFee, mockToken2],
				nativeTokens,
				exchanges,
				balances
			});

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe(mockToken2.id);
		});

		it('should filter out tokens with missing exchange rate', () => {
			const limitedExchanges: ExchangesData = {
				[ETHEREUM_TOKEN.id]: { usd: 2000, usd_market_cap: 1000000 }
			};

			const result = enrichTokensWithUsdAndBalance({
				tokens: [mockToken1, mockToken2],
				nativeTokens,
				exchanges: limitedExchanges,
				balances
			});

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe(mockToken1.id);
		});

		it('should preserve order of enriched tokens', () => {
			const result = enrichTokensWithUsdAndBalance({
				tokens: [mockToken2, mockToken1],
				nativeTokens,
				exchanges,
				balances
			});

			expect(result[0].id).toBe(mockToken2.id);
			expect(result[1].id).toBe(mockToken1.id);
		});

		it('should handle mix of valid and invalid tokens', () => {
			const tokenWithoutFee = {
				...mockToken1,
				fee: undefined
			};

			const result = enrichTokensWithUsdAndBalance({
				tokens: [mockToken1, tokenWithoutFee, mockToken2],
				nativeTokens,
				exchanges,
				balances
			});

			expect(result).toHaveLength(2);
			expect(result[0].id).toBe(mockToken1.id);
			expect(result[1].id).toBe(mockToken2.id);
		});
	});

	describe('extractQuoteData', () => {
		const validResponse: OpenCryptoPayResponse = {
			id: 'pl_test123',
			tag: 'payRequest',
			callback: 'https://api.dfx.swiss/v1/lnurlp/cb/pl_test123',
			minSendable: 1000,
			maxSendable: 10000,
			metadata: '[]',
			requestedAmount: {
				asset: 'CHF',
				amount: '10'
			},
			transferAmounts: [],
			quote: {
				id: 'quote123',
				expiration: '2025-12-31T23:59:59.000Z',
				payment: 'payment123'
			}
		};

		it('should extract quote id and callback from valid response', () => {
			const result = extractQuoteData(validResponse);

			expect(result).toEqual({
				quoteId: 'quote123',
				callback: 'https://api.dfx.swiss/v1/lnurlp/cb/pl_test123'
			});
		});

		it('should extract different quote id', () => {
			const response = {
				...validResponse,
				quote: {
					id: 'quote456',
					expiration: '2025-12-31T23:59:59.000Z',
					payment: 'payment456'
				}
			};

			const result = extractQuoteData(response);

			expect(result.quoteId).toBe('quote456');
		});

		it('should extract different callback', () => {
			const response = {
				...validResponse,
				callback: 'https://api.different.com/callback'
			};

			const result = extractQuoteData(response);

			expect(result.callback).toBe('https://api.different.com/callback');
		});

		it('should throw error when quote is null', () => {
			const invalidResponse = {
				...validResponse,
				quote: null
			} as unknown as OpenCryptoPayResponse;

			expect(() => extractQuoteData(invalidResponse)).toThrow(
				'Invalid OpenCryptoPay response data'
			);
		});

		it('should throw error when quote is undefined', () => {
			const invalidResponse = {
				...validResponse,
				quote: undefined
			} as unknown as OpenCryptoPayResponse;

			expect(() => extractQuoteData(invalidResponse)).toThrow(
				'Invalid OpenCryptoPay response data'
			);
		});

		it('should throw error when callback is null', () => {
			const invalidResponse = {
				...validResponse,
				callback: null
			} as unknown as OpenCryptoPayResponse;

			expect(() => extractQuoteData(invalidResponse)).toThrow(
				'Invalid OpenCryptoPay response data'
			);
		});

		it('should throw error when callback is undefined', () => {
			const invalidResponse = {
				...validResponse,
				callback: undefined
			} as unknown as OpenCryptoPayResponse;

			expect(() => extractQuoteData(invalidResponse)).toThrow(
				'Invalid OpenCryptoPay response data'
			);
		});

		it('should extract quote with additional properties', () => {
			const response: OpenCryptoPayResponse = {
				...validResponse,
				quote: {
					id: 'quote123',
					expiration: '2025-12-31T23:59:59.000Z',
					payment: 'payment123'
				}
			};

			const result = extractQuoteData(response);

			expect(result.quoteId).toBe('quote123');
		});
	});

	describe('validateDecodedData', () => {
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

				const result = validateDecodedData({
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

				const result = validateDecodedData({
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

			it('should validate ERC20 transfer successfully', () => {
				const decodedData: DecodedUrn = {
					prefix: 'ethereum',
					destination: USDC_TOKEN.address,
					ethereumChainId: String(USDC_TOKEN.network.chainId),
					functionName: 'transfer',
					address: '0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC'
				};

				const result = validateDecodedData({
					decodedData,
					token: erc20Token,
					amount: 1000000n,
					uri: 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=1000000'
				});

				expect(result).toEqual({
					destination: '0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC',
					feeData: {
						maxFeePerGas: 30000000000n,
						maxPriorityFeePerGas: 1000000000n
					},
					estimatedGasLimit: 65000n,
					ethereumChainId: USDC_TOKEN.network.chainId,
					value: 1000000n
				});
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
					validateDecodedData({
						decodedData: undefined,
						token: nativeToken,
						amount: 1000000000000000000n,
						uri: 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=1000000000000000000'
					})
				).toThrow();
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
					validateDecodedData({
						decodedData,
						token: tokenWithoutFee as unknown as PayableTokenWithConvertedAmount,
						amount: 1000000000000000000n,
						uri: 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=1000000000000000000'
					})
				).toThrow();
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
					validateDecodedData({
						decodedData,
						token: tokenWithIncompleteFee as unknown as PayableTokenWithConvertedAmount,
						amount: 1000000000000000000n,
						uri: 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=1000000000000000000'
					})
				).toThrow();
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
					validateDecodedData({
						decodedData,
						token: tokenWithIncompleteFee as unknown as PayableTokenWithConvertedAmount,
						amount: 1000000000000000000n,
						uri: 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=1000000000000000000'
					})
				).toThrow();
			});
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

	describe('validateNativeTransfer', () => {
		const mockToken: PayableTokenWithConvertedAmount = {
			...ETHEREUM_TOKEN,
			amount: '1.5',
			minFee: 0.001,
			tokenNetwork: 'Ethereum',
			amountInUSD: 100,
			feeInUSD: 10,
			sumInUSD: 110,
			fee: {
				feeInWei: 21000000000000000n,
				feeData: {
					maxFeePerGas: 12n,
					maxPriorityFeePerGas: 7n
				},
				estimatedGasLimit: 21000n
			}
		};

		const validDecodedData: DecodedUrn = {
			prefix: 'ethereum',
			destination: '0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC',
			ethereumChainId: '1'
		};

		const validParams = {
			amount: 1000000000000000000n,
			maxFeePerGas: 20000000000n,
			maxPriorityFeePerGas: 1000000000n,
			estimatedGasLimit: 21000n,
			token: mockToken,
			uri: 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=1000000000000000000'
		};

		it('should validate and return correct data structure', () => {
			const result = validateNativeTransfer({
				decodedData: validDecodedData,
				...validParams
			});

			expect(result).toEqual({
				destination: '0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC',
				feeData: {
					maxFeePerGas: 20000000000n,
					maxPriorityFeePerGas: 1000000000n
				},
				estimatedGasLimit: 21000n,
				value: 1000000000000000000n,
				ethereumChainId: 1n
			});
		});

		it('should validate data with different values', () => {
			const decodedData: DecodedUrn = {
				prefix: 'ethereum',
				destination: '0xcccccccccccccccccccccccccccccccccccccccc',
				ethereumChainId: '137'
			};

			const polygonToken = { ...mockToken, network: POLYGON_MAINNET_NETWORK };

			const result = validateNativeTransfer({
				decodedData,
				amount: 500000000000000000n,
				maxFeePerGas: 30000000000n,
				maxPriorityFeePerGas: 2000000000n,
				estimatedGasLimit: 21000n,
				token: polygonToken,
				uri: 'ethereum:0xcccccccccccccccccccccccccccccccccccccccc@137?value=500000000000000000'
			});

			expect(result.destination).toBe('0xcccccccccccccccccccccccccccccccccccccccc');
			expect(result.ethereumChainId).toBe(137n);
			expect(result.value).toBe(500000000000000000n);
			expect(result.feeData.maxFeePerGas).toBe(30000000000n);
			expect(result.estimatedGasLimit).toBe(21000n);
		});

		it('should throw error when URI value is missing', () => {
			expect(() =>
				validateNativeTransfer({
					decodedData: validDecodedData,
					...validParams,
					uri: 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1'
				})
			).toThrowError();
		});

		it('should throw error when URI value cannot be parsed', () => {
			expect(() =>
				validateNativeTransfer({
					decodedData: validDecodedData,
					...validParams,
					uri: 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=invalid'
				})
			).toThrowError();
		});

		it('should throw error when amount does not match URI value', () => {
			expect(() =>
				validateNativeTransfer({
					decodedData: validDecodedData,
					...validParams,
					amount: 2000000000000000000n,
					uri: 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=1000000000000000000'
				})
			).toThrowError();
		});

		it('should throw error when destination is not valid Ethereum address', () => {
			const invalidData: DecodedUrn = {
				...validDecodedData,
				destination: 'not-an-address'
			};

			expect(() =>
				validateNativeTransfer({
					decodedData: invalidData,
					...validParams,
					uri: 'ethereum:not-an-address@1?value=1000000000000000000'
				})
			).toThrowError();
		});

		it('should preserve BigInt types', () => {
			const result = validateNativeTransfer({
				decodedData: validDecodedData,
				...validParams
			});

			expect(typeof result.feeData.maxFeePerGas).toBe('bigint');
			expect(typeof result.feeData.maxPriorityFeePerGas).toBe('bigint');
			expect(typeof result.estimatedGasLimit).toBe('bigint');
			expect(typeof result.value).toBe('bigint');
			expect(typeof result.ethereumChainId).toBe('bigint');
		});

		it('should handle zero value transfers', () => {
			const result = validateNativeTransfer({
				decodedData: validDecodedData,
				...validParams,
				amount: ZERO,
				uri: 'ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=0'
			});

			expect(result.value).toBe(ZERO);
		});

		it('should handle very large amounts', () => {
			const largeAmount = 999999999999999999999n;

			const result = validateNativeTransfer({
				decodedData: validDecodedData,
				...validParams,
				amount: largeAmount,
				uri: `ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=${largeAmount}`
			});

			expect(result.value).toBe(largeAmount);
		});

		it('should handle mixed case addresses', () => {
			const mixedCaseAddress = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
			const decodedData: DecodedUrn = {
				...validDecodedData,
				destination: mixedCaseAddress
			};

			const result = validateNativeTransfer({
				decodedData,
				...validParams,
				uri: `ethereum:${mixedCaseAddress}@1?value=1000000000000000000`
			});

			expect(result.destination).toBe(mixedCaseAddress);
		});
	});

	describe('validateERC20Transfer', () => {
		const mockErc20Token: PayableTokenWithConvertedAmount = {
			...USDC_TOKEN,
			amount: '1.5',
			minFee: 0.001,
			tokenNetwork: 'Base',
			amountInUSD: 100,
			feeInUSD: 10,
			sumInUSD: 110,
			fee: {
				feeInWei: 21000000000000000n,
				feeData: {
					maxFeePerGas: 12n,
					maxPriorityFeePerGas: 7n
				},
				estimatedGasLimit: 21000n
			}
		};

		const recipient = '0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC';
		const tokenContract = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

		const validDecodedData: DecodedUrn = {
			prefix: 'ethereum',
			destination: tokenContract,
			ethereumChainId: '1',
			functionName: 'transfer',
			address: recipient
		};

		const validParams = {
			amount: 1000000n,
			maxFeePerGas: 20000000000n,
			maxPriorityFeePerGas: 1000000000n,
			estimatedGasLimit: 65000n,
			token: mockErc20Token,
			uri: `ethereum:${tokenContract}@1/transfer?address=${recipient}&uint256=1000000`
		};

		it('should validate and return correct data structure', () => {
			const result = validateERC20Transfer({
				decodedData: validDecodedData,
				...validParams
			});

			expect(result).toEqual({
				destination: recipient,
				feeData: {
					maxFeePerGas: 20000000000n,
					maxPriorityFeePerGas: 1000000000n
				},
				estimatedGasLimit: 65000n,
				value: 1000000n,
				ethereumChainId: 1n
			});
		});

		it('should validate data with different values', () => {
			const baseToken = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
			const baseUSDC = {
				...mockErc20Token,
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

			const result = validateERC20Transfer({
				decodedData,
				amount: 5000000n,
				maxFeePerGas: 100000000n,
				maxPriorityFeePerGas: 50000000n,
				estimatedGasLimit: 65000n,
				token: baseUSDC,
				uri: `ethereum:${baseToken}@56/transfer?address=${recipient}&uint256=5000000`
			});

			expect(result.destination).toBe(recipient);
			expect(result.ethereumChainId).toBe(56n);
			expect(result.value).toBe(5000000n);
		});

		it('should throw error when address (recipient) is missing', () => {
			const invalidData: DecodedUrn = {
				...validDecodedData,
				address: undefined
			};

			expect(() =>
				validateERC20Transfer({
					decodedData: invalidData,
					...validParams
				})
			).toThrowError();
		});

		it('should throw error when URI uint256 is missing', () => {
			expect(() =>
				validateERC20Transfer({
					decodedData: validDecodedData,
					...validParams,
					uri: `ethereum:${tokenContract}@1/transfer?address=${recipient}`
				})
			).toThrowError();
		});

		it('should throw error when URI uint256 cannot be parsed', () => {
			expect(() =>
				validateERC20Transfer({
					decodedData: validDecodedData,
					...validParams,
					uri: `ethereum:${tokenContract}@1/transfer?address=${recipient}&uint256=invalid`
				})
			).toThrowError();
		});

		it('should throw error when token contract mismatch', () => {
			const invalidData: DecodedUrn = {
				...validDecodedData,
				destination: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
			};

			expect(() =>
				validateERC20Transfer({
					decodedData: invalidData,
					...validParams
				})
			).toThrowError();
		});

		it('should throw error when amount does not match URI uint256', () => {
			expect(() =>
				validateERC20Transfer({
					decodedData: validDecodedData,
					...validParams,
					amount: 2000000n,
					uri: `ethereum:${tokenContract}@1/transfer?address=${recipient}&uint256=1000000`
				})
			).toThrowError();
		});

		it('should throw error when recipient address is not valid', () => {
			const invalidData: DecodedUrn = {
				...validDecodedData,
				address: 'not-an-address'
			};

			expect(() =>
				validateERC20Transfer({
					decodedData: invalidData,
					...validParams,
					uri: `ethereum:${tokenContract}@1/transfer?address=not-an-address&uint256=1000000`
				})
			).toThrowError();
		});

		it('should preserve BigInt types', () => {
			const result = validateERC20Transfer({
				decodedData: validDecodedData,
				...validParams
			});

			expect(typeof result.feeData.maxFeePerGas).toBe('bigint');
			expect(typeof result.feeData.maxPriorityFeePerGas).toBe('bigint');
			expect(typeof result.estimatedGasLimit).toBe('bigint');
			expect(typeof result.value).toBe('bigint');
			expect(typeof result.ethereumChainId).toBe('bigint');
		});

		it('should handle large amounts', () => {
			const largeAmount = 999999999999n;

			const result = validateERC20Transfer({
				decodedData: validDecodedData,
				...validParams,
				amount: largeAmount,
				uri: `ethereum:${tokenContract}@1/transfer?address=${recipient}&uint256=${largeAmount}`
			});

			expect(result.value).toBe(largeAmount);
		});

		it('should handle mixed case recipient address', () => {
			const mixedCaseRecipient = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
			const decodedData: DecodedUrn = {
				...validDecodedData,
				address: mixedCaseRecipient
			};

			const result = validateERC20Transfer({
				decodedData,
				...validParams,
				uri: `ethereum:${tokenContract}@1/transfer?address=${mixedCaseRecipient}&uint256=1000000`
			});

			expect(result.destination).toBe(mixedCaseRecipient);
		});
	});
});
