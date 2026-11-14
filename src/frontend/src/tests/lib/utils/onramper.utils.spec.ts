import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import {
	ETHEREUM_NETWORK,
	ETHEREUM_NETWORK_ID,
	SEPOLIA_NETWORK
} from '$env/networks/networks.eth.env';
import { ICP_NETWORK, ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { SOLANA_DEVNET_NETWORK } from '$env/networks/networks.sol.env';
import { ONRAMPER_API_KEY, ONRAMPER_BASE_URL } from '$env/rest/onramper.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { Erc20Token } from '$eth/types/erc20';
import * as backendApi from '$lib/api/backend.api';
import { ONRAMPER_IDS_GRACE_MS } from '$lib/constants/onramper.constants';
import { Currency } from '$lib/enums/currency';
import type {
	OnramperIdsByAddress,
	OnramperIdsLoading,
	OnramperNetworkWallet,
	OnramperWalletAddress
} from '$lib/types/onramper';
import type { Token } from '$lib/types/token';
import {
	buildOnramperLink,
	findOnramperId,
	indexOnramperIds,
	mapOnramperNetworkWallets,
	needsOnramperIdLookup,
	toOnramperTokenParams,
	type BuildOnramperLinkParams,
	type OnramperLinkParams
} from '$lib/utils/onramper.utils';
import type { SplToken } from '$sol/types/spl';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockAccountIdentifierText, mockIdentity } from '$tests/mocks/identity.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
import type { Nullish } from '@dfinity/zod-schemas';

describe('onramper.utils', () => {
	describe('buildOnramperLink', () => {
		const mockSignature = 'a'.repeat(64);

		const linkParams = ({
			identity,
			wallets,
			networkWallets,
			...params
		}: Pick<BuildOnramperLinkParams, 'identity' | 'wallets' | 'networkWallets'> &
			OnramperLinkParams): BuildOnramperLinkParams => ({
			identity,
			wallets,
			networkWallets,
			toParams: () => params
		});

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

			const params = linkParams({
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
			});

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

			const params = linkParams({
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
			});

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

		it('should add the sell_* parameters for the Sell tab', async () => {
			const signedQuery = `networkWallets=bitcoin:${mockBtcAddress}&wallets=btc:${mockBtcAddress}`;
			mockSignOnramperWidgetUrl(signedQuery);

			const params = linkParams({
				identity: mockIdentity,
				mode: 'buy,sell',
				defaultFiat: Currency.EUR,
				defaultCrypto: 'eth',
				onlyCryptos: ['btc', 'eth'],
				onlyCryptoNetworks: ['bitcoin', 'ethereum'],
				sell_defaultFiat: Currency.EUR,
				sell_defaultCrypto: 'eth',
				sell_onlyCryptos: ['btc', 'eth'],
				sell_onlyCryptoNetworks: ['bitcoin', 'ethereum'],
				wallets: [{ cryptoId: 'btc', wallet: mockBtcAddress }],
				networkWallets: [{ networkId: 'bitcoin', wallet: mockBtcAddress }],
				supportRecurringPayments: true,
				enableCountrySelector: true,
				themeName: 'dark'
			});

			const expectedUrl =
				`${ONRAMPER_BASE_URL}?apiKey=${ONRAMPER_API_KEY}` +
				`&mode=buy,sell&defaultFiat=eur&defaultCrypto=eth` +
				`&onlyCryptos=btc,eth&onlyCryptoNetworks=bitcoin,ethereum` +
				`&sell_defaultFiat=eur&sell_defaultCrypto=eth` +
				`&sell_onlyCryptos=btc,eth&sell_onlyCryptoNetworks=bitcoin,ethereum` +
				`&supportRecurringPayments=true&enableCountrySelector=true` +
				`&themeName=dark` +
				`&${signedQuery}` +
				`&signature=${mockSignature}`;

			const result = await buildOnramperLink(params);

			expect(result).toBe(expectedUrl);
		});

		it('should handle empty wallets array', async () => {
			mockSignOnramperWidgetUrl('');

			const params = linkParams({
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
			});

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

			const params = linkParams({
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
			});

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

			const params = linkParams({
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
			});

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

			const params = linkParams({
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
			});

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

			const params = linkParams({
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
			});

			await expect(buildOnramperLink(params)).rejects.toThrow(
				/OnRamper signing secret is not configured/
			);
		});

		describe('with ids from OnRamper lists', () => {
			const minimalParams: OnramperLinkParams = {
				mode: 'buy,sell',
				onlyCryptos: ['aave_ethereum'],
				onlyCryptoNetworks: ['ethereum'],
				supportRecurringPayments: false,
				enableCountrySelector: false,
				themeName: 'dark'
			};

			const buyIds: OnramperIdsByAddress = new Map([['ethereum:0xaave', 'aave_ethereum']]);
			const sellIds: OnramperIdsByAddress = new Map([['ethereum:0xaave', 'aave_ethereum']]);

			const never = new Promise<OnramperIdsByAddress | undefined>(() => {});

			const arriving = ({ ids, after }: { ids: OnramperIdsByAddress; after: number }) =>
				new Promise<OnramperIdsByAddress>((resolve) => setTimeout(() => resolve(ids), after));

			beforeEach(() => {
				vi.useFakeTimers();

				mockSignOnramperWidgetUrl('');
			});

			afterEach(() => {
				vi.useRealTimers();
			});

			const build = (onramperIds?: OnramperIdsLoading) => {
				const toParams = vi.fn(() => minimalParams);

				const state: { url?: string } = {};

				const link = buildOnramperLink({
					identity: mockIdentity,
					wallets: [],
					networkWallets: [],
					onramperIds,
					toParams
				}).then((url) => {
					state.url = url;
					return url;
				});

				return { toParams, state, link };
			};

			it('passes the lists that came in while the backend signed', async () => {
				const { toParams, link } = build({
					buy: Promise.resolve(buyIds),
					sell: Promise.resolve(sellIds)
				});

				await expect(link).resolves.toBe(
					`${ONRAMPER_BASE_URL}?apiKey=${ONRAMPER_API_KEY}` +
						`&mode=buy,sell&onlyCryptos=aave_ethereum&onlyCryptoNetworks=ethereum` +
						`&supportRecurringPayments=false&enableCountrySelector=false&themeName=dark` +
						`&signature=${mockSignature}`
				);

				expect(toParams).toHaveBeenCalledExactlyOnceWith({ buy: buyIds, sell: sellIds });
			});

			it('builds the link right away when no list is loading', async () => {
				const { toParams, link } = build();

				await link;

				expect(toParams).toHaveBeenCalledExactlyOnceWith(undefined);
			});

			it('uses lists that arrive within the grace after the signing', async () => {
				const { toParams, state, link } = build({
					buy: arriving({ ids: buyIds, after: ONRAMPER_IDS_GRACE_MS - 1 }),
					sell: arriving({ ids: sellIds, after: ONRAMPER_IDS_GRACE_MS - 1 })
				});

				await vi.advanceTimersByTimeAsync(ONRAMPER_IDS_GRACE_MS - 2);

				expect(state.url).toBeUndefined();

				await vi.advanceTimersByTimeAsync(1);
				await link;

				expect(toParams).toHaveBeenCalledExactlyOnceWith({ buy: buyIds, sell: sellIds });
			});

			it('builds the link without the lists once the grace is over', async () => {
				const { toParams, state, link } = build({ buy: never, sell: never });

				await vi.advanceTimersByTimeAsync(ONRAMPER_IDS_GRACE_MS - 1);

				expect(state.url).toBeUndefined();
				expect(toParams).not.toHaveBeenCalled();

				await vi.advanceTimersByTimeAsync(1);
				await link;

				expect(toParams).toHaveBeenCalledExactlyOnceWith({ buy: undefined, sell: undefined });
			});

			it('keeps a list that came in when the other is late', async () => {
				const { toParams, state, link } = build({ buy: Promise.resolve(buyIds), sell: never });

				await vi.advanceTimersByTimeAsync(ONRAMPER_IDS_GRACE_MS - 1);

				expect(state.url).toBeUndefined();

				await vi.advanceTimersByTimeAsync(1);
				await link;

				expect(toParams).toHaveBeenCalledExactlyOnceWith({ buy: buyIds, sell: undefined });
			});
		});
	});

	const aaveAddress = '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9';
	const pyusdMint = '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo';

	// Imported tokens: no built-in OnRamper id.
	const aaveToken: Erc20Token = {
		...mockValidErc20Token,
		address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9'
	};
	const pyusdToken: SplToken = { ...mockValidSplToken, address: pyusdMint };

	describe('indexOnramperIds', () => {
		it('finds an EVM address in any letter case', () => {
			const ids = indexOnramperIds([
				{ id: 'aave_ethereum', network: 'ethereum', address: aaveAddress.toUpperCase() }
			]);

			expect(findOnramperId({ token: aaveToken, ids })).toBe('aave_ethereum');
		});

		it('finds a Solana mint only in its own letter case', () => {
			expect(
				findOnramperId({
					token: pyusdToken,
					ids: indexOnramperIds([{ id: 'pyusd_solana', network: 'solana', address: pyusdMint }])
				})
			).toBe('pyusd_solana');

			expect(
				findOnramperId({
					token: pyusdToken,
					ids: indexOnramperIds([
						{ id: 'pyusd_solana', network: 'solana', address: pyusdMint.toLowerCase() }
					])
				})
			).toBeUndefined();
		});

		it('matches the network too', () => {
			const ids = indexOnramperIds([{ id: 'aave_base', network: 'base', address: aaveAddress }]);

			expect(findOnramperId({ token: aaveToken, ids })).toBeUndefined();
		});

		it('leaves out the tokens without an address', () => {
			const ids = indexOnramperIds([
				{ id: 'usdt_arbitrum', network: 'arbitrum', address: null },
				{ id: 'steth_ethereum', network: 'ethereum' },
				{ id: 'btc', network: 'bitcoin', address: '' }
			]);

			expect(ids.size).toBe(0);
		});

		it('leaves out an address listed under more than one id', () => {
			const ids = indexOnramperIds([
				{ id: 'eurc_ethereum', network: 'ethereum', address: aaveAddress },
				{ id: 'euroc_ethereum', network: 'ethereum', address: aaveAddress },
				{ id: 'eurc_ethereum', network: 'ethereum', address: aaveAddress }
			]);

			expect(findOnramperId({ token: aaveToken, ids })).toBeUndefined();
		});

		it('keeps an address listed twice under the same id', () => {
			const ids = indexOnramperIds([
				{ id: 'aave_ethereum', network: 'ethereum', address: aaveAddress },
				{ id: 'aave_ethereum', network: 'ethereum', address: aaveAddress }
			]);

			expect(findOnramperId({ token: aaveToken, ids })).toBe('aave_ethereum');
		});
	});

	describe('findOnramperId', () => {
		const ids: OnramperIdsByAddress = indexOnramperIds([
			{ id: 'aave_ethereum', network: 'ethereum', address: aaveAddress },
			{ id: 'pyusd_solana', network: 'solana', address: pyusdMint },
			{ id: 'ckbtc_icp', network: 'icp', address: mockValidIcToken.ledgerCanisterId }
		]);

		it('prefers the id from the list over a built-in one', () => {
			const token: Erc20Token = { ...aaveToken, buy: { onramperId: 'stale_id' } };

			expect(findOnramperId({ token, ids })).toBe('aave_ethereum');
		});

		it('falls back to the built-in id when the list has no match or is missing', () => {
			const token: Erc20Token = { ...mockValidErc20Token, buy: { onramperId: 'built_in' } };

			expect(findOnramperId({ token, ids })).toBe('built_in');
			expect(findOnramperId({ token: { ...aaveToken, buy: { onramperId: 'built_in' } } })).toBe(
				'built_in'
			);
		});

		it('keeps the built-in id of a native coin', () => {
			expect(findOnramperId({ token: ETHEREUM_TOKEN, ids })).toBe(ETHEREUM_TOKEN.buy?.onramperId);
		});

		it('finds an ERC-20 token by its contract address', () => {
			expect(findOnramperId({ token: aaveToken, ids })).toBe('aave_ethereum');
		});

		it('finds an SPL token by its mint', () => {
			expect(findOnramperId({ token: pyusdToken, ids })).toBe('pyusd_solana');
		});

		it('does not look up an ICRC token', () => {
			expect(findOnramperId({ token: mockValidIcToken, ids })).toBeUndefined();
		});

		it('does not look up a token on a network OnRamper does not cover', () => {
			expect(
				findOnramperId({ token: { ...pyusdToken, network: SOLANA_DEVNET_NETWORK }, ids })
			).toBeUndefined();

			expect(
				findOnramperId({ token: { ...aaveToken, network: SEPOLIA_NETWORK }, ids })
			).toBeUndefined();
		});

		it('finds nothing without a list', () => {
			expect(findOnramperId({ token: aaveToken })).toBeUndefined();
		});
	});

	describe('needsOnramperIdLookup', () => {
		it('is false for native coins', () => {
			expect(needsOnramperIdLookup([ETHEREUM_TOKEN, ICP_TOKEN])).toBeFalsy();
		});

		it('is true with an ERC-20 or SPL token, with or without a built-in id', () => {
			expect(needsOnramperIdLookup([ETHEREUM_TOKEN, aaveToken])).toBeTruthy();
			expect(needsOnramperIdLookup([pyusdToken])).toBeTruthy();
			expect(
				needsOnramperIdLookup([{ ...aaveToken, buy: { onramperId: 'aave_ethereum' } }])
			).toBeTruthy();
		});

		it('is false for an ICRC token without a built-in id', () => {
			expect(needsOnramperIdLookup([ICP_TOKEN, mockValidIcToken])).toBeFalsy();
		});

		it('is false for a token on a network OnRamper does not cover', () => {
			expect(needsOnramperIdLookup([{ ...aaveToken, network: SEPOLIA_NETWORK }])).toBeFalsy();
		});
	});

	describe('toOnramperTokenParams', () => {
		const ids = indexOnramperIds([
			{ id: 'aave_ethereum', network: 'ethereum', address: aaveAddress },
			{ id: 'pyusd_solana', network: 'solana', address: pyusdMint }
		]);

		it('offers the tokens of the selected network that have an id', () => {
			expect(
				toOnramperTokenParams({
					selectedNetworkTokens: [ETHEREUM_TOKEN, aaveToken, mockValidErc20Token],
					enabledTokens: [ETHEREUM_TOKEN, aaveToken, ICP_TOKEN, pyusdToken],
					openTokens: [],
					ids
				})
			).toEqual({
				defaultCrypto: undefined,
				onlyCryptos: [ETHEREUM_TOKEN.buy?.onramperId, 'aave_ethereum']
			});
		});

		it('offers every enabled token with an id when the selected network has none', () => {
			expect(
				toOnramperTokenParams({
					selectedNetworkTokens: [mockValidErc20Token],
					enabledTokens: [ICP_TOKEN, pyusdToken, mockValidIcToken],
					openTokens: [],
					ids
				}).onlyCryptos
			).toEqual([ICP_TOKEN.buy?.onramperId, 'pyusd_solana']);
		});

		it('offers the tokens with a built-in id only, without a list', () => {
			expect(
				toOnramperTokenParams({
					selectedNetworkTokens: [ETHEREUM_TOKEN, aaveToken],
					enabledTokens: [],
					openTokens: [aaveToken]
				})
			).toEqual({ defaultCrypto: undefined, onlyCryptos: [ETHEREUM_TOKEN.buy?.onramperId] });
		});

		it('opens on the first open token that has an id', () => {
			const params = (openTokens: Token[]) =>
				toOnramperTokenParams({
					selectedNetworkTokens: [],
					enabledTokens: [],
					openTokens,
					ids
				}).defaultCrypto;

			expect(params([aaveToken, ICP_TOKEN])).toBe('aave_ethereum');
			expect(params([mockValidErc20Token, ICP_TOKEN])).toBe(ICP_TOKEN.buy?.onramperId);
			expect(params([mockValidIcToken])).toBeUndefined();
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
