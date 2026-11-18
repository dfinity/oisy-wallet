import {
	BASE_NETWORK_ID,
	BASE_SEPOLIA_NETWORK_ID
} from '$env/networks/networks-evm/networks.evm.base.env';
import { BTC_MAINNET_NETWORK_ID, BTC_TESTNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ICP_NETWORK, ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { USDC_TOKEN_GROUP } from '$env/tokens/groups/groups.usdc.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { USDC_TOKEN as ARBITRUM_USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens-erc20/tokens.usdc.env';
import { USDCE_TOKEN } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens-erc20/tokens.usdce.env';
import {
	SEPOLIA_USDC_TOKEN as BASE_SEPOLIA_USDC_TOKEN,
	USDC_TOKEN as BASE_USDC_TOKEN
} from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.usdc.env';
import {
	IC_CKBTC_LEDGER_CANISTER_ID,
	IC_CKBTC_MINTER_CANISTER_ID
} from '$env/tokens/tokens-icrc/tokens.icrc.ck.btc.env';
import { IC_CKUSDC_LEDGER_CANISTER_ID } from '$env/tokens/tokens-icrc/tokens.icrc.ck.erc20.env';
import {
	IC_CKETH_LEDGER_CANISTER_ID,
	IC_CKETH_MINTER_CANISTER_ID
} from '$env/tokens/tokens-icrc/tokens.icrc.ck.eth.env';
import { BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import type { IcCkToken } from '$icp/types/ic-token';
import type { ReceiveAddressSources, ReceiveRoute } from '$lib/types/receive';
import type { Token } from '$lib/types/token';
import {
	findReceiveAssetByToken,
	getAutoReceiveRoute,
	getCertifiedAddress,
	getReceiveAddressKind,
	getReceiveAddressTexts,
	getReceiveAddressTitle,
	getReceiveAssetKey,
	getReceiveAssets,
	getReceiveConvertTwinToken,
	getReceiveNetworkAddressSource,
	getReceiveRouteOptionTexts,
	getReceiveRoutes,
	getReceiveTokenKey,
	isReceiveConversionOffer,
	isReceiveTestToken,
	resolveReceiveAddress
} from '$lib/utils/receive.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockAccountIdentifierText, mockPrincipalText } from '$tests/mocks/identity.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';

describe('receive.utils', () => {
	const ckBtcToken: IcCkToken = {
		...mockValidIcToken,
		id: parseTokenId('ckBTC'),
		symbol: 'ckBTC',
		name: 'ckBTC',
		network: ICP_NETWORK,
		standard: { code: 'icrc' },
		ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
		minterCanisterId: IC_CKBTC_MINTER_CANISTER_ID,
		twinToken: BTC_MAINNET_TOKEN
	};

	const ckEthToken: IcCkToken = {
		...ckBtcToken,
		id: parseTokenId('ckETH'),
		symbol: 'ckETH',
		name: 'ckETH',
		ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID,
		minterCanisterId: IC_CKETH_MINTER_CANISTER_ID,
		twinToken: ETHEREUM_TOKEN
	};

	const ckUsdcToken: IcCkToken = {
		...ckEthToken,
		id: parseTokenId('ckUSDC'),
		symbol: 'ckUSDC',
		name: 'ckUSDC',
		ledgerCanisterId: IC_CKUSDC_LEDGER_CANISTER_ID ?? 'xevnm-gaaaa-aaaar-qafnq-cai',
		twinToken: USDC_TOKEN,
		groupData: USDC_TOKEN_GROUP
	};

	const importedUsdcOnBase: Token = {
		...BASE_USDC_TOKEN,
		id: parseTokenId('USDC'),
		address: '0x0000000000000000000000000000000000000001',
		groupData: undefined
	} as Token;

	const enabledNetworkIds = [
		ICP_NETWORK_ID,
		BTC_MAINNET_NETWORK_ID,
		ETHEREUM_NETWORK_ID,
		BASE_NETWORK_ID,
		SOLANA_MAINNET_NETWORK_ID
	];

	describe('getReceiveAssets', () => {
		const tokens = [
			USDC_TOKEN,
			BASE_USDC_TOKEN,
			ARBITRUM_USDC_TOKEN,
			USDCE_TOKEN,
			ckUsdcToken,
			BASE_SEPOLIA_USDC_TOKEN,
			importedUsdcOnBase
		];

		it('should group the verified USDC versions across networks', () => {
			const assets = getReceiveAssets({ tokens });

			const usdc = assets.find(({ key }) => key === getReceiveAssetKey(USDC_TOKEN));

			expect(usdc?.tokens).toEqual([USDC_TOKEN, BASE_USDC_TOKEN, ARBITRUM_USDC_TOKEN]);
		});

		it('should keep USDC.e, ckUSDC, a test USDC and an imported USDC as their own entries', () => {
			const assets = getReceiveAssets({ tokens });

			expect(assets).toHaveLength(5);

			for (const token of [USDCE_TOKEN, ckUsdcToken, BASE_SEPOLIA_USDC_TOKEN, importedUsdcOnBase]) {
				expect(findReceiveAssetByToken({ assets, token })?.tokens).toEqual([token]);
			}
		});

		it('should rank the entries with a version on the preferred network first and show that version', () => {
			const assets = getReceiveAssets({
				tokens: [ICP_TOKEN, ...tokens],
				preferredNetworkId: BASE_NETWORK_ID
			});

			expect(assets[0].tokens).toContain(BASE_USDC_TOKEN);
			expect(assets[0].token).toBe(BASE_USDC_TOKEN);
			expect(assets.at(-1)?.token).not.toBe(ICP_TOKEN);
			expect(assets.findIndex(({ token }) => token === ICP_TOKEN)).toBeGreaterThan(0);
		});

		it('should keep BTC and ckBTC apart even though the portfolio groups them', () => {
			const assets = getReceiveAssets({ tokens: [BTC_MAINNET_TOKEN, ckBtcToken] });

			expect(assets).toHaveLength(2);
		});
	});

	describe('getReceiveTokenKey', () => {
		it('should not depend on the TokenId', () => {
			expect(getReceiveTokenKey({ ...ckBtcToken, id: parseTokenId('other') })).toBe(
				getReceiveTokenKey(ckBtcToken)
			);
		});

		it('should tell two contracts with the same symbol apart', () => {
			expect(getReceiveTokenKey(importedUsdcOnBase)).not.toBe(getReceiveTokenKey(BASE_USDC_TOKEN));
		});
	});

	describe('getReceiveAddressKind', () => {
		it.each([
			[ICP_TOKEN, 'icp'],
			[ckBtcToken, 'icrc'],
			[ETHEREUM_TOKEN, 'evm'],
			[BASE_USDC_TOKEN, 'evm'],
			[BTC_MAINNET_TOKEN, 'btc'],
			[SOLANA_TOKEN, 'sol']
		])('should resolve %s.symbol to %s', (...[token, kind]) => {
			expect(getReceiveAddressKind(token)).toBe(kind);
		});
	});

	describe('getReceiveRoutes', () => {
		it('should offer a direct BTC route on Bitcoin for native BTC', () => {
			const routes = getReceiveRoutes({ tokens: [BTC_MAINNET_TOKEN], enabledNetworkIds });

			expect(routes).toHaveLength(1);
			expect(routes[0]).toMatchObject({
				kind: 'direct',
				addressKind: 'btc',
				sourceToken: BTC_MAINNET_TOKEN,
				creditedToken: BTC_MAINNET_TOKEN
			});
		});

		it('should offer native BTC as ckBTC too, when the catalog has the ckBTC it credits', () => {
			const routes = getReceiveRoutes({
				tokens: [BTC_MAINNET_TOKEN],
				enabledNetworkIds,
				catalog: [BTC_MAINNET_TOKEN, ckBtcToken]
			});

			expect(routes.map(({ kind, creditedToken }) => [kind, creditedToken])).toEqual([
				['direct', BTC_MAINNET_TOKEN],
				['ckbtc-deposit', ckBtcToken]
			]);

			// The same route as ckBTC's own deposit, whichever asset the person started from.
			expect(routes[1].key).toBe(
				getReceiveRoutes({ tokens: [ckBtcToken], enabledNetworkIds })[1].key
			);
		});

		it('should not offer ckBTC for BTC without a ckBTC that OISY can check deposits for', () => {
			const testVariant: IcCkToken = {
				...ckBtcToken,
				ledgerCanisterId: 'mc6ru-gyaaa-aaaar-qaaaq-cai',
				twinToken: BTC_TESTNET_TOKEN
			};

			expect(
				getReceiveRoutes({
					tokens: [BTC_MAINNET_TOKEN],
					enabledNetworkIds,
					catalog: [testVariant]
				})
			).toHaveLength(1);

			expect(
				getReceiveRoutes({
					tokens: [BTC_TESTNET_TOKEN],
					enabledNetworkIds: [...enabledNetworkIds, BTC_TESTNET_NETWORK_ID],
					catalog: [ckBtcToken]
				})
			).toHaveLength(1);
		});

		it('should offer ckBTC directly on Internet Computer and as a Bitcoin deposit', () => {
			const routes = getReceiveRoutes({ tokens: [ckBtcToken], enabledNetworkIds });

			expect(routes.map(({ kind, addressKind }) => [kind, addressKind])).toEqual([
				['direct', 'icrc'],
				['ckbtc-deposit', 'ckbtc-deposit']
			]);
			expect(routes[1]).toMatchObject({
				sourceToken: BTC_MAINNET_TOKEN,
				sourceNetwork: BTC_MAINNET_TOKEN.network,
				creditedToken: ckBtcToken
			});
		});

		it('should only offer direct ckBTC when Bitcoin is disabled', () => {
			const routes = getReceiveRoutes({
				tokens: [ckBtcToken],
				enabledNetworkIds: [ICP_NETWORK_ID]
			});

			expect(routes.map(({ kind }) => kind)).toEqual(['direct']);
		});

		it('should only offer direct ckBTC for a variant without a deposit check', () => {
			const testVariant: IcCkToken = {
				...ckBtcToken,
				ledgerCanisterId: 'mc6ru-gyaaa-aaaar-qaaaq-cai',
				twinToken: BTC_TESTNET_TOKEN
			};

			const routes = getReceiveRoutes({
				tokens: [testVariant],
				enabledNetworkIds: [...enabledNetworkIds, BTC_TESTNET_NETWORK_ID]
			});

			expect(routes.map(({ kind }) => kind)).toEqual(['direct']);
		});

		it('should only offer direct ckBTC without a minter', () => {
			const routes = getReceiveRoutes({
				tokens: [{ ...ckBtcToken, minterCanisterId: undefined } as unknown as Token],
				enabledNetworkIds
			});

			expect(routes.map(({ kind }) => kind)).toEqual(['direct']);
		});

		it('should list every enabled network of a grouped asset with the preferred one first', () => {
			const routes = getReceiveRoutes({
				tokens: [USDC_TOKEN, BASE_USDC_TOKEN, ARBITRUM_USDC_TOKEN],
				enabledNetworkIds,
				preferredNetworkId: BASE_NETWORK_ID
			});

			expect(routes.map(({ sourceToken }) => sourceToken)).toEqual([BASE_USDC_TOKEN, USDC_TOKEN]);
		});

		it('should offer SOL and ckSOL routes only to regular wallet destinations', () => {
			const ckSolToken: IcCkToken = {
				...ckBtcToken,
				id: parseTokenId('ckSOL'),
				symbol: 'ckSOL',
				ledgerCanisterId: 'ls5lp-lqaaa-aaaar-qb5oa-cai',
				twinToken: SOLANA_TOKEN
			};

			const routes = getReceiveRoutes({ tokens: [SOLANA_TOKEN, ckSolToken], enabledNetworkIds });

			expect(routes.map(({ kind, addressKind }) => [kind, addressKind])).toEqual([
				['direct', 'sol'],
				['direct', 'icrc']
			]);
		});

		it('should drop the routes of a disabled network', () => {
			expect(
				getReceiveRoutes({
					tokens: [BASE_SEPOLIA_USDC_TOKEN],
					enabledNetworkIds
				})
			).toEqual([]);

			expect(
				getReceiveRoutes({
					tokens: [BASE_SEPOLIA_USDC_TOKEN],
					enabledNetworkIds: [BASE_SEPOLIA_NETWORK_ID]
				})
			).toHaveLength(1);
		});
	});

	describe('isReceiveConversionOffer', () => {
		it('should flag the ckBTC deposit in the BTC list only', () => {
			const [btcDirect, btcAsCkBtc] = getReceiveRoutes({
				tokens: [BTC_MAINNET_TOKEN],
				enabledNetworkIds,
				catalog: [ckBtcToken]
			});
			const [, ckBtcDeposit] = getReceiveRoutes({ tokens: [ckBtcToken], enabledNetworkIds });

			expect(
				isReceiveConversionOffer({ route: btcAsCkBtc, assetTokens: [BTC_MAINNET_TOKEN] })
			).toBeTruthy();
			expect(
				isReceiveConversionOffer({ route: btcDirect, assetTokens: [BTC_MAINNET_TOKEN] })
			).toBeFalsy();
			expect(
				isReceiveConversionOffer({ route: ckBtcDeposit, assetTokens: [ckBtcToken] })
			).toBeFalsy();
		});

		it('should not flag another version of a grouped asset', () => {
			const routes = getReceiveRoutes({
				tokens: [USDC_TOKEN, BASE_USDC_TOKEN],
				enabledNetworkIds
			});

			expect(
				routes.some((route) =>
					isReceiveConversionOffer({ route, assetTokens: [USDC_TOKEN, BASE_USDC_TOKEN] })
				)
			).toBeFalsy();
		});
	});

	describe('getAutoReceiveRoute', () => {
		const [direct, deposit] = getReceiveRoutes({ tokens: [ckBtcToken], enabledNetworkIds });

		it('should pick a single direct route', () => {
			expect(getAutoReceiveRoute([direct])).toBe(direct);
		});

		it('should not pick a deposit route even when it is the only one', () => {
			expect(getAutoReceiveRoute([deposit])).toBeUndefined();
		});

		it('should not pick when there are several routes', () => {
			expect(getAutoReceiveRoute([direct, deposit])).toBeUndefined();
		});
	});

	describe('isReceiveTestToken', () => {
		it('should flag test network tokens', () => {
			expect(isReceiveTestToken(BASE_SEPOLIA_USDC_TOKEN)).toBeTruthy();
			expect(isReceiveTestToken(BTC_TESTNET_TOKEN)).toBeTruthy();
			expect(isReceiveTestToken(BASE_USDC_TOKEN)).toBeFalsy();
		});
	});

	describe('getReceiveConvertTwinToken', () => {
		it('should return the Ethereum twin of ckETH on an enabled network', () => {
			expect(getReceiveConvertTwinToken({ token: ckEthToken, enabledNetworkIds })).toBe(
				ETHEREUM_TOKEN
			);
		});

		it('should return the Sepolia twin when Sepolia is enabled', () => {
			const ckSepoliaEth = { ...ckEthToken, twinToken: SEPOLIA_TOKEN };

			expect(
				getReceiveConvertTwinToken({
					token: ckSepoliaEth,
					enabledNetworkIds: [...enabledNetworkIds, SEPOLIA_NETWORK_ID]
				})
			).toBe(SEPOLIA_TOKEN);

			expect(
				getReceiveConvertTwinToken({ token: ckSepoliaEth, enabledNetworkIds })
			).toBeUndefined();
		});

		it('should offer no conversion for ckBTC or a token without a twin', () => {
			expect(getReceiveConvertTwinToken({ token: ckBtcToken, enabledNetworkIds })).toBeUndefined();
			expect(getReceiveConvertTwinToken({ token: ICP_TOKEN, enabledNetworkIds })).toBeUndefined();
		});
	});

	describe('resolveReceiveAddress', () => {
		const sources: ReceiveAddressSources = {
			icrcAddress: mockPrincipalText,
			icpAccountId: mockAccountIdentifierText,
			evm: { data: mockEthAddress, certified: true },
			btcMainnet: { data: mockBtcAddress, certified: true },
			btcTestnet: undefined,
			btcRegtest: undefined,
			solMainnet: { data: mockSolAddress, certified: false },
			solDevnet: undefined,
			solLocal: null,
			xrpMainnet: undefined,
			ckBtcDeposit: undefined
		};

		const routeOf = ({ token, index = 0 }: { token: Token; index?: number }): ReceiveRoute =>
			getReceiveRoutes({ tokens: [token], enabledNetworkIds })[index];

		it('should open native ICP on the Principal and switch to the Account ID', () => {
			const route = routeOf({ token: ICP_TOKEN });

			expect(resolveReceiveAddress({ route, icpFormat: 'principal', sources })).toEqual({
				status: 'ready',
				address: mockPrincipalText
			});
			expect(resolveReceiveAddress({ route, icpFormat: 'account-id', sources })).toEqual({
				status: 'ready',
				address: mockAccountIdentifierText
			});
		});

		it('should give ICRC tokens the ICRC address whatever the ICP format', () => {
			expect(
				resolveReceiveAddress({
					route: routeOf({ token: ckBtcToken }),
					icpFormat: 'account-id',
					sources
				})
			).toEqual({ status: 'ready', address: mockPrincipalText });
		});

		it('should show three different destinations for BTC, ckBTC and BTC deposited as ckBTC', () => {
			const depositAddress = 'bc1q-deposit';

			const withDeposit: ReceiveAddressSources = {
				...sources,
				ckBtcDeposit: { [ckBtcToken.id]: { data: depositAddress, certified: true } }
			};

			const resolve = (route: ReceiveRoute) =>
				resolveReceiveAddress({ route, icpFormat: 'principal', sources: withDeposit });

			expect(resolve(routeOf({ token: BTC_MAINNET_TOKEN }))).toEqual({
				status: 'ready',
				address: mockBtcAddress
			});
			expect(resolve(routeOf({ token: ckBtcToken }))).toEqual({
				status: 'ready',
				address: mockPrincipalText
			});
			expect(resolve(routeOf({ token: ckBtcToken, index: 1 }))).toEqual({
				status: 'ready',
				address: depositAddress
			});
		});

		it('should not show an uncertified wallet address', () => {
			expect(
				resolveReceiveAddress({
					route: routeOf({ token: SOLANA_TOKEN }),
					icpFormat: 'principal',
					sources
				})
			).toEqual({ status: 'loading' });
		});

		it('should report a failed load as an error', () => {
			expect(
				resolveReceiveAddress({
					route: routeOf({ token: ckBtcToken, index: 1 }),
					icpFormat: 'principal',
					sources: { ...sources, ckBtcDeposit: { [ckBtcToken.id]: null } }
				})
			).toEqual({ status: 'error' });
		});

		it('should never answer a route with the address of another one', () => {
			// The deposit address is still loading while the BTC wallet address is ready.
			expect(
				resolveReceiveAddress({
					route: routeOf({ token: ckBtcToken, index: 1 }),
					icpFormat: 'principal',
					sources
				})
			).toEqual({ status: 'loading' });
		});

		it('should use the shared EVM address for an EVM token', () => {
			expect(
				resolveReceiveAddress({
					route: routeOf({ token: BASE_USDC_TOKEN }),
					icpFormat: 'principal',
					sources
				})
			).toEqual({ status: 'ready', address: mockEthAddress });
		});
	});

	describe('getCertifiedAddress', () => {
		it('should return only a certified address', () => {
			expect(getCertifiedAddress({ data: mockBtcAddress, certified: true })).toBe(mockBtcAddress);
			expect(getCertifiedAddress({ data: mockBtcAddress, certified: false })).toBeUndefined();
			expect(getCertifiedAddress(null)).toBeUndefined();
			expect(getCertifiedAddress(undefined)).toBeUndefined();
		});
	});

	describe('getReceiveNetworkAddressSource', () => {
		const routeOf = ({ token, index = 0 }: { token: Token; index?: number }): ReceiveRoute =>
			getReceiveRoutes({
				tokens: [token],
				enabledNetworkIds: [...enabledNetworkIds, BTC_TESTNET_NETWORK_ID]
			})[index];

		it('should pick the store of the exact network', () => {
			expect(getReceiveNetworkAddressSource(routeOf({ token: BTC_MAINNET_TOKEN }))).toBe(
				'btcMainnet'
			);
			expect(getReceiveNetworkAddressSource(routeOf({ token: BTC_TESTNET_TOKEN }))).toBe(
				'btcTestnet'
			);
			expect(getReceiveNetworkAddressSource(routeOf({ token: SOLANA_TOKEN }))).toBe('solMainnet');
		});

		it('should share one store between the EVM networks', () => {
			expect(getReceiveNetworkAddressSource(routeOf({ token: ETHEREUM_TOKEN }))).toBe('evm');
			expect(getReceiveNetworkAddressSource(routeOf({ token: BASE_USDC_TOKEN }))).toBe('evm');
		});

		it('should have no store for the identity and deposit addresses', () => {
			expect(getReceiveNetworkAddressSource(routeOf({ token: ICP_TOKEN }))).toBeUndefined();
			expect(getReceiveNetworkAddressSource(routeOf({ token: ckBtcToken }))).toBeUndefined();
			expect(
				getReceiveNetworkAddressSource(routeOf({ token: ckBtcToken, index: 1 }))
			).toBeUndefined();
		});
	});

	describe('address texts', () => {
		const routeOf = ({ token, index = 0 }: { token: Token; index?: number }): ReceiveRoute =>
			getReceiveRoutes({ tokens: [token], enabledNetworkIds })[index];

		it('should title a direct route by what to send and where', () => {
			expect(getReceiveAddressTitle({ route: routeOf({ token: ETHEREUM_TOKEN }), i18n: en })).toBe(
				'Receive ETH on Ethereum'
			);
		});

		it('should title a deposit by what it credits and through which network', () => {
			expect(
				getReceiveAddressTitle({ route: routeOf({ token: ckBtcToken, index: 1 }), i18n: en })
			).toBe('Receive ckBTC via Bitcoin');
		});

		it('should name a network address after its network', () => {
			expect(
				getReceiveAddressTexts({
					route: routeOf({ token: BTC_MAINNET_TOKEN }),
					icpFormat: 'principal',
					i18n: en
				})
			).toEqual({
				label: 'Bitcoin address',
				copyAriaLabel: 'Copy Bitcoin address',
				copiedText: 'Bitcoin address copied to clipboard.'
			});
		});

		it('should name the ICP address after the chosen format', () => {
			const route = routeOf({ token: ICP_TOKEN });

			expect(getReceiveAddressTexts({ route, icpFormat: 'principal', i18n: en })).toEqual({
				label: en.receive.token.text.principal_label,
				copyAriaLabel: en.receive.token.text.copy_principal,
				copiedText: en.receive.icp.text.internet_computer_principal_copied
			});
			expect(getReceiveAddressTexts({ route, icpFormat: 'account-id', i18n: en })).toEqual({
				label: en.receive.token.text.account_id_label,
				copyAriaLabel: en.receive.token.text.copy_account_id,
				copiedText: en.receive.icp.text.account_id_copied
			});
		});

		it('should name the deposit address as such', () => {
			expect(
				getReceiveAddressTexts({
					route: routeOf({ token: ckBtcToken, index: 1 }),
					icpFormat: 'principal',
					i18n: en
				})
			).toEqual({
				label: en.receive.ckbtc.text.deposit_address,
				copyAriaLabel: en.receive.ckbtc.text.copy_deposit_address,
				copiedText: en.receive.ckbtc.text.deposit_address_copied
			});
		});
	});

	describe('getReceiveRouteOptionTexts', () => {
		const [direct, offer] = getReceiveRoutes({
			tokens: [BTC_MAINNET_TOKEN],
			enabledNetworkIds,
			catalog: [ckBtcToken]
		});

		it('should offer ckBTC with the confirmations once known', () => {
			const texts = (confirmations?: number) =>
				getReceiveRouteOptionTexts({
					route: offer,
					assetTokens: [BTC_MAINNET_TOKEN],
					withOffer: true,
					confirmations,
					i18n: en
				});

			expect(texts(4)).toEqual({
				title: 'Receive as ckBTC',
				description: '4 confirmations, then fast and cheap'
			});
			expect(texts().description).toBe(en.receive.ckbtc.text.benefit_generic);
		});

		it('should name the asset rather than the network next to an offer', () => {
			expect(
				getReceiveRouteOptionTexts({
					route: direct,
					assetTokens: [BTC_MAINNET_TOKEN],
					withOffer: true,
					i18n: en
				})
			).toEqual({ title: 'Receive BTC', description: 'Send BTC on Bitcoin' });
		});

		it('should name the network when the routes differ only by network', () => {
			const [ethereum] = getReceiveRoutes({ tokens: [USDC_TOKEN], enabledNetworkIds });

			expect(
				getReceiveRouteOptionTexts({
					route: ethereum,
					assetTokens: [USDC_TOKEN, BASE_USDC_TOKEN],
					withOffer: false,
					i18n: en
				}).title
			).toBe('Ethereum');
		});

		it('should describe the deposit of the ckBTC asset itself', () => {
			const [, deposit] = getReceiveRoutes({ tokens: [ckBtcToken], enabledNetworkIds });

			expect(
				getReceiveRouteOptionTexts({
					route: deposit,
					assetTokens: [ckBtcToken],
					withOffer: false,
					i18n: en
				})
			).toEqual({ title: 'Bitcoin', description: 'Send BTC to receive ckBTC' });
		});
	});
});
