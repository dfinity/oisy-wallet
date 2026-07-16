import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import {
	ETHEREUM_NETWORK,
	ETHEREUM_NETWORK_ID,
	SEPOLIA_NETWORK
} from '$env/networks/networks.eth.env';
import { ICP_NETWORK, ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { ONRAMPER_API_KEY, ONRAMPER_BASE_URL } from '$env/rest/onramper.env';
import * as backendApi from '$lib/api/backend.api';
import { Currency } from '$lib/enums/currency';
import type { OnramperNetworkWallet, OnramperWalletAddress } from '$lib/types/onramper';
import {
	buildOnramperLink,
	mapOnramperNetworkWallets,
	type BuildOnramperLinkParams
} from '$lib/utils/onramper.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockAccountIdentifierText, mockIdentity } from '$tests/mocks/identity.mock';
import type { Nullish } from '@dfinity/zod-schemas';

describe('onramper.utils', () => {
	describe('buildOnramperLink', () => {
		const mockSignature = 'a'.repeat(64);

		// The backend is now the single authority for the signed params: it returns both the
		// signature and the exact canonical query fragment (`signed_query`) it HMAC'd. buildOnramperLink
		// appends `signed_query` verbatim, so these specs assert that fragment flows through unchanged
		// rather than being re-derived from `wallets`/`networkWallets` on the frontend.
		const mockSignOnramperWidgetUrl = (signedQuery: string) =>
			vi
				.spyOn(backendApi, 'signOnramperWidgetUrl')
				.mockResolvedValue({ signature: mockSignature, signed_query: signedQuery });

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('should build the correct URL with all parameters', async () => {
			const signedQuery =
				`networkWallets=bitcoin:${mockBtcAddress},icp:${mockAccountIdentifierText}` +
				`&wallets=btc:${mockBtcAddress},icp:${mockAccountIdentifierText}`;
			mockSignOnramperWidgetUrl(signedQuery);

			const params: BuildOnramperLinkParams = {
				identity: mockIdentity,
				mode: 'buy',
				defaultFiat: Currency.USD,
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
				enableCountrySelector: false,
				themeName: 'dark'
			};

			const expectedUrl =
				`${ONRAMPER_BASE_URL}?apiKey=${ONRAMPER_API_KEY}` +
				`&mode=buy&defaultFiat=usd&defaultCrypto=icp` +
				`&onlyCryptos=btc,eth,icp&onlyCryptoNetworks=bitcoin,ethereum` +
				`&supportRecurringPayments=true&enableCountrySelector=false` +
				`&themeName=dark` +
				`&${signedQuery}` +
				`&signature=${mockSignature}`;

			const result = await buildOnramperLink(params);

			expect(result).toBe(expectedUrl);
			expect(backendApi.signOnramperWidgetUrl).toHaveBeenCalledWith({
				identity: mockIdentity,
				wallets: params.wallets,
				networkWallets: params.networkWallets
			});
		});

		it('should build the correct URL with only required parameters', async () => {
			const signedQuery = `networkWallets=bitcoin:${mockBtcAddress}&wallets=btc:${mockBtcAddress}`;
			mockSignOnramperWidgetUrl(signedQuery);

			const params: BuildOnramperLinkParams = {
				identity: mockIdentity,
				mode: 'buy',
				defaultFiat: Currency.EUR,
				onlyCryptos: ['btc'],
				onlyCryptoNetworks: ['bitcoin'],
				wallets: [{ cryptoId: 'btc', wallet: mockBtcAddress }],
				networkWallets: [{ networkId: 'bitcoin', wallet: mockBtcAddress }],
				supportRecurringPayments: false,
				enableCountrySelector: true,
				themeName: 'dark'
			};

			const expectedUrl =
				`${ONRAMPER_BASE_URL}?apiKey=${ONRAMPER_API_KEY}` +
				`&mode=buy&defaultFiat=eur` +
				`&onlyCryptos=btc&onlyCryptoNetworks=bitcoin` +
				`&supportRecurringPayments=false&enableCountrySelector=true` +
				`&themeName=dark` +
				`&${signedQuery}` +
				`&signature=${mockSignature}`;

			const result = await buildOnramperLink(params);

			expect(result).toBe(expectedUrl);
		});

		it('should handle empty wallets array', async () => {
			mockSignOnramperWidgetUrl('');

			const params: BuildOnramperLinkParams = {
				identity: mockIdentity,
				mode: 'buy',
				defaultFiat: Currency.EUR,
				onlyCryptos: ['btc', 'eth'],
				onlyCryptoNetworks: ['bitcoin', 'ethereum'],
				wallets: [],
				networkWallets: [],
				supportRecurringPayments: false,
				enableCountrySelector: true,
				themeName: 'dark'
			};

			const expectedUrl =
				`${ONRAMPER_BASE_URL}?apiKey=${ONRAMPER_API_KEY}` +
				`&mode=buy&defaultFiat=eur` +
				`&onlyCryptos=btc,eth&onlyCryptoNetworks=bitcoin,ethereum` +
				`&supportRecurringPayments=false&enableCountrySelector=true` +
				`&themeName=dark` +
				`&signature=${mockSignature}`;

			const result = await buildOnramperLink(params);

			expect(result).toBe(expectedUrl);
		});

		it('should handle only crypto wallets array', async () => {
			const signedQuery = `wallets=btc:${mockBtcAddress}`;
			mockSignOnramperWidgetUrl(signedQuery);

			const params: BuildOnramperLinkParams = {
				identity: mockIdentity,
				mode: 'buy',
				defaultFiat: Currency.EUR,
				onlyCryptos: ['btc', 'eth'],
				onlyCryptoNetworks: ['bitcoin', 'ethereum'],
				wallets: [{ cryptoId: 'btc', wallet: mockBtcAddress }],
				networkWallets: [],
				supportRecurringPayments: false,
				enableCountrySelector: true,
				themeName: 'dark'
			};

			const expectedUrl =
				`${ONRAMPER_BASE_URL}?apiKey=${ONRAMPER_API_KEY}` +
				`&mode=buy&defaultFiat=eur` +
				`&onlyCryptos=btc,eth&onlyCryptoNetworks=bitcoin,ethereum` +
				`&supportRecurringPayments=false&enableCountrySelector=true` +
				`&themeName=dark` +
				`&${signedQuery}` +
				`&signature=${mockSignature}`;

			const result = await buildOnramperLink(params);

			expect(result).toBe(expectedUrl);
		});

		it('should handle only network wallets array', async () => {
			const signedQuery = `networkWallets=bitcoin:${mockBtcAddress}`;
			mockSignOnramperWidgetUrl(signedQuery);

			const params: BuildOnramperLinkParams = {
				identity: mockIdentity,
				mode: 'buy',
				defaultFiat: Currency.EUR,
				onlyCryptos: ['btc', 'eth'],
				onlyCryptoNetworks: ['bitcoin', 'ethereum'],
				wallets: [],
				networkWallets: [{ networkId: 'bitcoin', wallet: mockBtcAddress }],
				supportRecurringPayments: false,
				enableCountrySelector: true,
				themeName: 'dark'
			};

			const expectedUrl =
				`${ONRAMPER_BASE_URL}?apiKey=${ONRAMPER_API_KEY}` +
				`&mode=buy&defaultFiat=eur` +
				`&onlyCryptos=btc,eth&onlyCryptoNetworks=bitcoin,ethereum` +
				`&supportRecurringPayments=false&enableCountrySelector=true` +
				`&themeName=dark` +
				`&${signedQuery}` +
				`&signature=${mockSignature}`;

			const result = await buildOnramperLink(params);

			expect(result).toBe(expectedUrl);
		});

		it('should handle empty onlyCryptos and onlyCryptoNetworks arrays', async () => {
			const signedQuery = `networkWallets=bitcoin:${mockBtcAddress}&wallets=btc:${mockBtcAddress}`;
			mockSignOnramperWidgetUrl(signedQuery);

			const params: BuildOnramperLinkParams = {
				identity: mockIdentity,
				mode: 'buy',
				defaultFiat: Currency.USD,
				onlyCryptos: [],
				onlyCryptoNetworks: [],
				wallets: [{ cryptoId: 'btc', wallet: mockBtcAddress }],
				networkWallets: [{ networkId: 'bitcoin', wallet: mockBtcAddress }],
				supportRecurringPayments: false,
				enableCountrySelector: true,
				themeName: 'dark'
			};

			const expectedUrl =
				`${ONRAMPER_BASE_URL}?apiKey=${ONRAMPER_API_KEY}` +
				`&mode=buy&defaultFiat=usd` +
				`&supportRecurringPayments=false&enableCountrySelector=true` +
				`&themeName=dark` +
				`&${signedQuery}` +
				`&signature=${mockSignature}`;

			const result = await buildOnramperLink(params);

			expect(result).toBe(expectedUrl);
		});

		it('propagates errors from the backend signing call', async () => {
			vi.spyOn(backendApi, 'signOnramperWidgetUrl').mockRejectedValue(
				new Error('OnRamper signing secret is not configured on the backend canister.')
			);

			const params: BuildOnramperLinkParams = {
				identity: mockIdentity,
				mode: 'buy',
				defaultFiat: Currency.USD,
				onlyCryptos: [],
				onlyCryptoNetworks: [],
				wallets: [{ cryptoId: 'btc', wallet: mockBtcAddress }],
				networkWallets: [],
				supportRecurringPayments: false,
				enableCountrySelector: true,
				themeName: 'dark'
			};

			await expect(buildOnramperLink(params)).rejects.toThrow(
				/OnRamper signing secret is not configured/
			);
		});
	});

	describe('mapOnramperNetworkWallets', () => {
		const walletMap: Map<symbol, Nullish<OnramperWalletAddress>> = new Map([
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

			const newWalletMap: Map<symbol, Nullish<OnramperWalletAddress>> = new Map(walletMap);
			newWalletMap.set(ETHEREUM_NETWORK_ID, undefined);

			const expectedWallets: OnramperNetworkWallet[] = [
				{ networkId: ICP_NETWORK.buy?.onramperId ?? 'icp', wallet: mockAccountIdentifierText }
			];

			const result = mapOnramperNetworkWallets({ networks, walletMap: newWalletMap });

			expect(result).toEqual(expectedWallets);
		});
	});
});
