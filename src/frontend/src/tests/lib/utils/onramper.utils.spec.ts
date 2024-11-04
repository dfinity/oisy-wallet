import {
	BTC_MAINNET_NETWORK_ID,
	ETHEREUM_NETWORK,
	ETHEREUM_NETWORK_ID,
	ICP_NETWORK,
	ICP_NETWORK_ID,
	SEPOLIA_NETWORK
} from '$env/networks.env';
import { ONRAMPER_API_KEY, ONRAMPER_BASE_URL } from '$env/rest/onramper.env';
import { ETHEREUM_TOKEN, ICP_TOKEN, SEPOLIA_TOKEN } from '$env/tokens.env';
import type {
	OnramperCryptoWallet,
	OnramperNetworkWallet,
	OnramperWalletAddress
} from '$lib/types/onramper';
import type { TokenStandard } from '$lib/types/token';
import type { Option } from '$lib/types/utils';
import {
	buildOnramperLink,
	mapOnramperNetworkWallets,
	mapOnramperWallets,
	type BuildOnramperLinkParams
} from '$lib/utils/onramper.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mocks';
import { mockAccountIdentifierText, mockPrincipalText } from '$tests/mocks/identity.mock';

describe('buildOnramperLink', () => {
	it('should build the correct URL with all parameters', () => {
		const params: BuildOnramperLinkParams = {
			mode: 'buy',
			defaultFiat: 'usd',
			defaultCrypto: 'icp',
			onlyCryptos: ['btc', 'eth', 'icp'],
			onlyCryptoNetworks: ['bitcoin', 'ethereum'],
			wallets: [
				{ cryptoId: 'btc', wallet: mockBtcAddress },
				{ cryptoId: 'icp', wallet: mockAccountIdentifierText }
			],
			networkWallets: [
				{ networkId: 'bitcoin', wallet: mockBtcAddress },
				{ networkId: 'icp', wallet: mockAccountIdentifierText }
			],
			supportRecurringPayments: true,
			enableCountrySelector: false
		};

		const expectedUrl =
			`${ONRAMPER_BASE_URL}?apiKey=${ONRAMPER_API_KEY}` +
			`&mode=buy&defaultFiat=usd&defaultCrypto=icp` +
			`&onlyCryptos=btc,eth,icp&onlyCryptoNetworks=bitcoin,ethereum` +
			`&supportRecurringPayments=true&enableCountrySelector=false` +
			`&wallets=btc:${mockBtcAddress},icp:${mockAccountIdentifierText}` +
			`&networkWallets=bitcoin:${mockBtcAddress},icp:${mockAccountIdentifierText}`;

		const result = buildOnramperLink(params);
		expect(result).toBe(expectedUrl);
	});

	it('should build the correct URL with only required parameters', () => {
		const params: BuildOnramperLinkParams = {
			mode: 'buy',
			defaultFiat: 'eur',
			onlyCryptos: ['btc'],
			onlyCryptoNetworks: ['bitcoin'],
			wallets: [{ cryptoId: 'btc', wallet: mockBtcAddress }],
			networkWallets: [{ networkId: 'bitcoin', wallet: mockBtcAddress }],
			supportRecurringPayments: false,
			enableCountrySelector: true
		};

		const expectedUrl =
			`${ONRAMPER_BASE_URL}?apiKey=${ONRAMPER_API_KEY}` +
			`&mode=buy&defaultFiat=eur` +
			`&onlyCryptos=btc&onlyCryptoNetworks=bitcoin` +
			`&supportRecurringPayments=false&enableCountrySelector=true` +
			`&wallets=btc:${mockBtcAddress}` +
			`&networkWallets=bitcoin:${mockBtcAddress}`;

		const result = buildOnramperLink(params);
		expect(result).toBe(expectedUrl);
	});

	it('should handle empty wallets array', () => {
		const params: BuildOnramperLinkParams = {
			mode: 'buy',
			defaultFiat: 'eur',
			onlyCryptos: ['btc', 'eth'],
			onlyCryptoNetworks: ['bitcoin', 'ethereum'],
			wallets: [],
			networkWallets: [],
			supportRecurringPayments: false,
			enableCountrySelector: true
		};

		const expectedUrl =
			`${ONRAMPER_BASE_URL}?apiKey=${ONRAMPER_API_KEY}` +
			`&mode=buy&defaultFiat=eur` +
			`&onlyCryptos=btc,eth&onlyCryptoNetworks=bitcoin,ethereum` +
			`&supportRecurringPayments=false&enableCountrySelector=true`;

		const result = buildOnramperLink(params);

		expect(result).toBe(expectedUrl);
	});

	it('should handle only crypto wallets array', () => {
		const params: BuildOnramperLinkParams = {
			mode: 'buy',
			defaultFiat: 'eur',
			onlyCryptos: ['btc', 'eth'],
			onlyCryptoNetworks: ['bitcoin', 'ethereum'],
			wallets: [{ cryptoId: 'btc', wallet: mockBtcAddress }],
			networkWallets: [],
			supportRecurringPayments: false,
			enableCountrySelector: true
		};

		const expectedUrl =
			`${ONRAMPER_BASE_URL}?apiKey=${ONRAMPER_API_KEY}` +
			`&mode=buy&defaultFiat=eur` +
			`&onlyCryptos=btc,eth&onlyCryptoNetworks=bitcoin,ethereum` +
			`&supportRecurringPayments=false&enableCountrySelector=true` +
			`&wallets=btc:${mockBtcAddress}`;

		const result = buildOnramperLink(params);

		expect(result).toBe(expectedUrl);
	});

	it('should handle only network wallets array', () => {
		const params: BuildOnramperLinkParams = {
			mode: 'buy',
			defaultFiat: 'eur',
			onlyCryptos: ['btc', 'eth'],
			onlyCryptoNetworks: ['bitcoin', 'ethereum'],
			wallets: [],
			networkWallets: [{ networkId: 'bitcoin', wallet: mockBtcAddress }],
			supportRecurringPayments: false,
			enableCountrySelector: true
		};

		const expectedUrl =
			`${ONRAMPER_BASE_URL}?apiKey=${ONRAMPER_API_KEY}` +
			`&mode=buy&defaultFiat=eur` +
			`&onlyCryptos=btc,eth&onlyCryptoNetworks=bitcoin,ethereum` +
			`&supportRecurringPayments=false&enableCountrySelector=true` +
			`&networkWallets=bitcoin:${mockBtcAddress}`;

		const result = buildOnramperLink(params);

		expect(result).toBe(expectedUrl);
	});

	it('should handle empty onlyCryptos and onlyCryptoNetworks arrays', () => {
		const params: BuildOnramperLinkParams = {
			mode: 'buy',
			defaultFiat: 'usd',
			onlyCryptos: [],
			onlyCryptoNetworks: [],
			wallets: [{ cryptoId: 'btc', wallet: mockBtcAddress }],
			networkWallets: [{ networkId: 'bitcoin', wallet: mockBtcAddress }],
			supportRecurringPayments: false,
			enableCountrySelector: true
		};

		const expectedUrl =
			`${ONRAMPER_BASE_URL}?apiKey=${ONRAMPER_API_KEY}` +
			`&mode=buy&defaultFiat=usd` +
			`&supportRecurringPayments=false&enableCountrySelector=true&wallets=btc:${mockBtcAddress}&networkWallets=bitcoin:${mockBtcAddress}`;

		const result = buildOnramperLink(params);

		expect(result).toBe(expectedUrl);
	});
});

describe('mapOnramperWallets', () => {
	const walletMap: { [key in TokenStandard]: Option<OnramperWalletAddress> } = {
		bitcoin: mockBtcAddress,
		ethereum: mockEthAddress,
		erc20: mockEthAddress,
		icrc: mockPrincipalText,
		icp: mockAccountIdentifierText
	};

	it('should return correct wallets when tokens have valid cryptoIds and wallets', () => {
		const tokens = [ICP_TOKEN, ETHEREUM_TOKEN, SEPOLIA_TOKEN];

		const expectedWallets: OnramperCryptoWallet[] = [
			{ cryptoId: ICP_TOKEN.buy?.onramperId ?? '', wallet: mockAccountIdentifierText },
			{ cryptoId: ETHEREUM_TOKEN.buy?.onramperId ?? '', wallet: mockEthAddress }
		];

		const result = mapOnramperWallets({ tokens, walletMap });

		expect(result).toEqual(expectedWallets);
	});

	it('should return an empty array if no valid tokens are present', () => {
		const tokens = [SEPOLIA_TOKEN];

		const result = mapOnramperWallets({ tokens, walletMap });

		expect(result).toEqual([]);
	});

	it('should handle cases where wallet addresses are null or undefined', () => {
		const tokens = [ICP_TOKEN, ETHEREUM_TOKEN];

		const newWalletMap: { [key in TokenStandard]: Option<OnramperWalletAddress> } = {
			...walletMap,
			ethereum: undefined
		};

		const expectedWallets: OnramperCryptoWallet[] = [
			{ cryptoId: ICP_TOKEN.buy?.onramperId ?? '', wallet: mockAccountIdentifierText }
		];

		const result = mapOnramperWallets({ tokens, walletMap: newWalletMap });

		expect(result).toEqual(expectedWallets);
	});
});

describe('mapOnramperNetworkWallets', () => {
	const walletMap: Map<symbol, Option<OnramperWalletAddress>> = new Map([
		[BTC_MAINNET_NETWORK_ID, mockBtcAddress],
		[ETHEREUM_NETWORK_ID, mockEthAddress],
		[ICP_NETWORK_ID, mockAccountIdentifierText]
	]);

	it('should return correct wallets when tokens have valid cryptoIds and wallets', () => {
		const networks = [ICP_NETWORK, ETHEREUM_NETWORK, SEPOLIA_NETWORK];

		const expectedWallets: OnramperNetworkWallet[] = [
			{ networkId: ICP_NETWORK.buy?.onramperId ?? 'icp', wallet: mockAccountIdentifierText },
			{ networkId: ETHEREUM_NETWORK.buy?.onramperId ?? 'icp', wallet: mockEthAddress }
		];

		const result = mapOnramperNetworkWallets({ networks, walletMap });

		expect(result).toEqual(expectedWallets);
	});

	it('should return an empty array if no valid tokens are present', () => {
		const networks = [SEPOLIA_NETWORK];

		const result = mapOnramperNetworkWallets({ networks, walletMap });

		expect(result).toEqual([]);
	});

	it('should handle cases where wallet addresses are null or undefined', () => {
		const networks = [ICP_NETWORK, ETHEREUM_NETWORK];

		const newWalletMap: Map<symbol, Option<OnramperWalletAddress>> = new Map(walletMap);
		newWalletMap.set(ETHEREUM_NETWORK_ID, undefined);

		const expectedWallets: OnramperNetworkWallet[] = [
			{ networkId: ICP_NETWORK.buy?.onramperId ?? 'icp', wallet: mockAccountIdentifierText }
		];

		const result = mapOnramperNetworkWallets({ networks, walletMap: newWalletMap });

		expect(result).toEqual(expectedWallets);
	});
});
