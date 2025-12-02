import {
	createPaymentMethodDataMap,
	decodeLNURL,
	formatAddress,
	mapTokenToPayableToken,
	prepareBasePayableTokens
} from '$lib/utils/open-crypto-pay.utils';

import type { Network } from '$lib/types/network';
import type { Address, PaymentMethodData } from '$lib/types/open-crypto-pay';
import type { Token } from '$lib/types/token';

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
});
