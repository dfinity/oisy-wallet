import type { CustomToken } from '$declarations/backend/backend.did';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import * as tokensIcrcAdditionalEnv from '$env/tokens/tokens-icrc/tokens.icrc.additional.env';
import {
	GLDT_LEDGER_CANISTER_ID,
	TCYCLES_LEDGER_CANISTER_ID
} from '$env/tokens/tokens-icrc/tokens.icrc.additional.env';
import { IC_CKBTC_LEDGER_CANISTER_ID } from '$env/tokens/tokens-icrc/tokens.icrc.ck.btc.env';
import * as tokensIcrcEnv from '$env/tokens/tokens-icrc/tokens.icrc.env';
import { SNS_BUILTIN_TOKENS } from '$env/tokens/tokens.sns.env';
import {
	hasSufficientIcrcAllowance,
	isIcrcTokenSupportIcrc2,
	isIcrcTokenSupportIcrc3,
	loadCustomTokens,
	loadDisabledIcrcTokensBalances,
	loadDisabledIcrcTokensExchanges,
	saveDefaultEnabledIcrcTokens
} from '$icp/services/icrc.services';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import * as icrcMetadataUtils from '$icp/utils/icrc-metadata.utils';
import * as backendApi from '$lib/api/backend.api';
import { BackendCanister } from '$lib/canisters/backend.canister';
import { TRACK_COUNT_IC_LOADING_ICRC_CANISTER_ERROR } from '$lib/constants/analytics.constants';
import { ZERO } from '$lib/constants/app.constants';
import {
	PLAUSIBLE_EVENTS,
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_SUBCONTEXT_TOKENS
} from '$lib/enums/plausible';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import { trackEvent } from '$lib/services/analytics.services';
import * as exchangeServices from '$lib/services/exchange.services';
import { balancesStore } from '$lib/stores/balances.store';
import { exchangeStore } from '$lib/stores/exchange.store';
import { i18n } from '$lib/stores/i18n.store';
import * as toastsStore from '$lib/stores/toasts.store';
import type { CanisterIdText } from '$lib/types/canister';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import { mockIcrcCustomToken } from '$tests/mocks/icrc-custom-tokens.mock';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import { fromNullable, nonNullish, nowInBigIntNanoSeconds, toNullable } from '@dfinity/utils';
import {
	IcrcLedgerCanister,
	fromCandidAccount,
	type IcrcLedgerDid
} from '@icp-sdk/canisters/ledger/icrc';
import { Principal } from '@icp-sdk/core/principal';
import * as idbKeyval from 'idb-keyval';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

vi.mock('$app/environment', () => ({
	browser: true
}));

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

describe('icrc.services', () => {
	const mockLedgerCanisterId = 'bw4dl-smaaa-aaaaa-qaacq-cai';
	const mockIndexCanisterId = 'b77ix-eeaaa-aaaaa-qaada-cai';
	const disabledIcrcTokens = [
		{
			...mockValidIcCkToken,
			twinToken: {
				...mockValidIcCkToken,
				address: mockEthAddress
			}
		},
		{ ...mockIcrcCustomToken, id: parseTokenId('MockToken') }
	];

	describe('loadCustomTokens', () => {
		const backendCanisterMock = mock<BackendCanister>();
		const ledgerCanisterMock = mock<IcrcLedgerCanister>();

		const mockDecimals = 22n;
		const mockFee = 456n;
		const mockName = 'Test';
		const mockSymbol = 'TST';

		const mockOnSuccess = vi.fn();

		const mockCustomToken: CustomToken = {
			token: {
				Icrc: {
					index_id: [Principal.fromText(mockIndexCanisterId)],
					ledger_id: Principal.fromText(mockLedgerCanisterId)
				}
			},
			version: [1n],
			enabled: true,
			section: toNullable(),
			allow_external_content_source: toNullable(true),
			allowed_external_content_source_urls: toNullable()
		};

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(IcrcLedgerCanister, 'create').mockImplementation(() => ledgerCanisterMock);

			// eslint-disable-next-line require-await
			vi.spyOn(BackendCanister, 'create').mockImplementation(async () => backendCanisterMock);

			icrcCustomTokensStore.resetAll();
		});

		describe('success', () => {
			let spyMetadata: MockInstance;
			let spyMintingAccount: MockInstance;

			beforeEach(() => {
				spyMetadata = ledgerCanisterMock.metadata.mockResolvedValue([
					['icrc1:name', { Text: mockName }],
					['icrc1:symbol', { Text: mockSymbol }],
					['icrc1:decimals', { Nat: mockDecimals }],
					['icrc1:fee', { Nat: mockFee }]
				]);

				spyMintingAccount = ledgerCanisterMock.getMintingAccount.mockResolvedValue(
					toNullable({ owner: mockPrincipal, subaccount: toNullable() })
				);
			});

			const testLoadCustomTokens = async ({
				mockCustomToken,
				ledgerCanisterId
			}: {
				mockCustomToken: CustomToken;
				ledgerCanisterId: CanisterIdText;
			}) => {
				await loadCustomTokens({ identity: mockIdentity, onSuccess: mockOnSuccess });

				const tokens = get(icrcCustomTokensStore);

				const token = (tokens ?? []).find(
					({ data: { ledgerCanisterId: tokenLedgerId } }) => tokenLedgerId === ledgerCanisterId
				);

				// This is just for type safety, since we created the mock with the token field
				assert('Icrc' in mockCustomToken.token);

				expect(token).not.toBeNull();
				expect(token).toStrictEqual({
					certified: true,
					data: {
						category: 'custom',
						tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.CRYPTO }],
						decimals: Number(mockDecimals),
						enabled: true,
						fee: mockFee,
						id: expect.any(Symbol),
						...(nonNullish(fromNullable(mockCustomToken.token.Icrc.index_id)) && {
							indexCanisterId: mockIndexCanisterId
						}),
						ledgerCanisterId: mockLedgerCanisterId,
						mintingAccount: fromCandidAccount({ owner: mockPrincipal, subaccount: toNullable() }),
						name: mockName,
						network: ICP_NETWORK,
						standard: { code: 'icrc' },
						symbol: mockSymbol,
						version: fromNullable(mockCustomToken.version),
						allowExternalContentSource: fromNullable(mockCustomToken.allow_external_content_source)
					}
				});

				// query + update
				expect(mockOnSuccess).toHaveBeenCalledTimes(2);
			};

			it('should load custom tokens with index canister', async () => {
				backendCanisterMock.listCustomTokens.mockResolvedValue([mockCustomToken]);

				await testLoadCustomTokens({ mockCustomToken, ledgerCanisterId: mockLedgerCanisterId });
			});

			it('should load custom tokens without index canister', async () => {
				const mockCustomToken: CustomToken = {
					token: {
						Icrc: {
							index_id: [],
							ledger_id: Principal.fromText(mockLedgerCanisterId)
						}
					},
					version: [1n],
					enabled: true,
					section: toNullable(),
					allow_external_content_source: toNullable(true),
					allowed_external_content_source_urls: toNullable()
				};

				backendCanisterMock.listCustomTokens.mockResolvedValue([mockCustomToken]);

				await testLoadCustomTokens({ mockCustomToken, ledgerCanisterId: mockLedgerCanisterId });
			});

			it('should load custom tokens without calling ledger metadata', async () => {
				const dragginzLedgerCanisterId = 'zfcdd-tqaaa-aaaaq-aaaga-cai';
				const dragginzIndexCanisterId = 'zlaol-iaaaa-aaaaq-aaaha-cai';

				const mockCustomToken: CustomToken = {
					token: {
						Icrc: {
							index_id: [Principal.fromText(dragginzIndexCanisterId)],
							ledger_id: Principal.fromText(dragginzLedgerCanisterId)
						}
					},
					version: [1n],
					enabled: true,
					section: toNullable(),
					allow_external_content_source: toNullable(false),
					allowed_external_content_source_urls: toNullable()
				};

				backendCanisterMock.listCustomTokens.mockResolvedValue([mockCustomToken]);

				await loadCustomTokens({ identity: mockIdentity });

				const tokens = get(icrcCustomTokensStore);

				const token = (tokens ?? []).find(
					({ data: { ledgerCanisterId: tokenLedgerId } }) =>
						tokenLedgerId === dragginzLedgerCanisterId
				);

				expect(token).toStrictEqual({
					certified: true,
					data: {
						category: 'custom',
						tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.CRYPTO }],
						decimals: 8,
						enabled: true,
						fee: 100000n,
						id: expect.any(Symbol),
						indexCanisterId: dragginzIndexCanisterId,
						ledgerCanisterId: dragginzLedgerCanisterId,
						mintingAccount: fromCandidAccount({ owner: mockPrincipal, subaccount: toNullable() }),
						name: 'Draggin Karma Points',
						network: ICP_NETWORK,
						standard: { code: 'icrc' },
						symbol: 'DKP',
						version: fromNullable(mockCustomToken.version),
						allowExternalContentSource: fromNullable(mockCustomToken.allow_external_content_source),
						alternativeName: 'Dragginz',
						explorerUrl: 'https://dashboard.internetcomputer.org/sns/zxeu2-7aaaa-aaaaq-aaafa-cai',
						icon: '/icons/sns/zfcdd-tqaaa-aaaaq-aaaga-cai.png'
					}
				});

				expect(spyMetadata).not.toHaveBeenCalled();

				expect(spyMintingAccount).toHaveBeenCalledTimes(2);
				expect(spyMintingAccount).toHaveBeenNthCalledWith(1, {
					certified: false
				});
				expect(spyMintingAccount).toHaveBeenNthCalledWith(2, {
					certified: true
				});
			});

			it('should call metadata with query and certified', async () => {
				backendCanisterMock.listCustomTokens.mockResolvedValue([mockCustomToken]);

				await testLoadCustomTokens({ mockCustomToken, ledgerCanisterId: mockLedgerCanisterId });

				expect(spyMetadata).toHaveBeenCalledTimes(2);
				expect(spyMetadata).toHaveBeenNthCalledWith(1, {
					certified: false
				});
				expect(spyMetadata).toHaveBeenNthCalledWith(2, {
					certified: true
				});
			});

			it('should call minting account with query and certified', async () => {
				backendCanisterMock.listCustomTokens.mockResolvedValue([mockCustomToken]);

				await testLoadCustomTokens({ mockCustomToken, ledgerCanisterId: mockLedgerCanisterId });

				expect(spyMintingAccount).toHaveBeenCalledTimes(2);
				expect(spyMintingAccount).toHaveBeenNthCalledWith(1, {
					certified: false
				});
				expect(spyMintingAccount).toHaveBeenNthCalledWith(2, {
					certified: true
				});
			});

			it('should call list custom tokens with query and certified', async () => {
				const spyListCustomTokens = backendCanisterMock.listCustomTokens.mockResolvedValue([
					mockCustomToken
				]);

				await testLoadCustomTokens({ mockCustomToken, ledgerCanisterId: mockLedgerCanisterId });

				expect(spyListCustomTokens).toHaveBeenCalledTimes(2);
				expect(spyListCustomTokens).toHaveBeenNthCalledWith(1);
				expect(spyListCustomTokens).toHaveBeenNthCalledWith(2);
			});

			it('should cache the custom tokens in IDB on update call', async () => {
				backendCanisterMock.listCustomTokens.mockResolvedValue([mockCustomToken]);

				await testLoadCustomTokens({ mockCustomToken, ledgerCanisterId: mockLedgerCanisterId });

				expect(idbKeyval.set).toHaveBeenCalledExactlyOnceWith(
					mockIdentity.getPrincipal().toText(),
					[mockCustomToken],
					expect.any(Object)
				);
			});

			it('should fetch the cached custom tokens in IDB on query call', async () => {
				await loadCustomTokens({ identity: mockIdentity, useCache: true });

				expect(idbKeyval.get).toHaveBeenCalledExactlyOnceWith(
					mockIdentity.getPrincipal().toText(),
					expect.any(Object)
				);
			});
		});

		describe('error', () => {
			let spyToastsShow: MockInstance;
			let spyToastsError: MockInstance;

			beforeEach(() => {
				icrcCustomTokensStore.setAll([
					{
						data: mockIcrcCustomToken,
						certified: true
					}
				]);

				ledgerCanisterMock.metadata.mockResolvedValue([
					['icrc1:name', { Text: mockName }],
					['icrc1:symbol', { Text: mockSymbol }],
					['icrc1:decimals', { Nat: mockDecimals }],
					['icrc1:fee', { Nat: mockFee }]
				]);

				spyToastsError = vi.spyOn(toastsStore, 'toastsError');
				spyToastsShow = vi.spyOn(toastsStore, 'toastsShow');
			});

			it('should reset all and toasts on list custom tokens error', async () => {
				const tokens = get(icrcCustomTokensStore);

				expect(tokens).toHaveLength(1);

				const err = new Error('test');
				backendCanisterMock.listCustomTokens.mockRejectedValue(err);

				await loadCustomTokens({ identity: mockIdentity });

				const afterTokens = get(icrcCustomTokensStore);

				expect(afterTokens).toBeNull();
			});

			it('should show a toast error on list custom tokens error', async () => {
				const err = new Error('test');
				backendCanisterMock.listCustomTokens.mockRejectedValue(err);

				await loadCustomTokens({ identity: mockIdentity });

				expect(spyToastsError).toHaveBeenCalledWith({
					msg: { text: get(i18n).init.error.load_token_list }
				});
			});

			it('should show track event on list custom tokens error', async () => {
				const err = new Error('test');
				backendCanisterMock.listCustomTokens.mockRejectedValue(err);

				await loadCustomTokens({ identity: mockIdentity });

				expect(trackEvent).toHaveBeenCalledOnce();
				expect(trackEvent).toHaveBeenNthCalledWith(1, {
					name: TRACK_COUNT_IC_LOADING_ICRC_CANISTER_ERROR,
					metadata: {
						error: err.message
					}
				});
			});

			it('should ignore tokens on metadata error', async () => {
				const tokens = get(icrcCustomTokensStore);

				expect(tokens).toHaveLength(1);

				backendCanisterMock.listCustomTokens.mockResolvedValue([mockCustomToken]);

				const err = new Error('test');
				ledgerCanisterMock.metadata.mockRejectedValue(err);

				await loadCustomTokens({ identity: mockIdentity });

				const afterTokens = get(icrcCustomTokensStore);

				expect(afterTokens).toEqual(tokens);

				expect(spyToastsError).not.toHaveBeenCalled();

				expect(trackEvent).toHaveBeenCalledTimes(2);
				expect(trackEvent).toHaveBeenNthCalledWith(1, {
					name: PLAUSIBLE_EVENTS.LOAD_CUSTOM_TOKENS,
					metadata: {
						event_context: PLAUSIBLE_EVENT_CONTEXTS.TOKENS,
						event_subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_TOKENS.ICRC,
						error: err.message
					}
				});
				expect(trackEvent).toHaveBeenNthCalledWith(2, {
					name: PLAUSIBLE_EVENTS.LOAD_CUSTOM_TOKENS,
					metadata: {
						event_context: PLAUSIBLE_EVENT_CONTEXTS.TOKENS,
						event_subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_TOKENS.ICRC,
						error: err.message
					}
				});
			});

			it('should show a custom toast on metadata error if the token was enabled', async () => {
				backendCanisterMock.listCustomTokens.mockResolvedValue([
					{ ...mockCustomToken, enabled: true }
				]);

				const err = new Error('test');
				ledgerCanisterMock.metadata.mockRejectedValue(err);

				await loadCustomTokens({ identity: mockIdentity });

				expect(spyToastsShow).toHaveBeenCalledExactlyOnceWith({
					text: replacePlaceholders(get(i18n).init.error.icrc_canister_loading_custom, {
						$ledgerCanisterId: mockLedgerCanisterId
					}),
					level: 'warn'
				});
			});

			it('should show a curated toast on metadata error if the token is in the curated list', async () => {
				const [curatedToken] = SNS_BUILTIN_TOKENS;
				const curatedLedgerCanisterId = curatedToken.ledgerCanisterId;

				backendCanisterMock.listCustomTokens.mockResolvedValue([
					{
						...mockCustomToken,
						enabled: true,
						token: {
							Icrc: {
								index_id: [Principal.fromText(mockIndexCanisterId)],
								ledger_id: Principal.fromText(curatedLedgerCanisterId)
							}
						}
					}
				]);

				vi.spyOn(icrcMetadataUtils, 'buildIcrcCustomTokenMetadataPseudoResponse').mockReturnValue(
					undefined
				);

				const err = new Error('test');
				ledgerCanisterMock.metadata.mockRejectedValue(err);

				await loadCustomTokens({ identity: mockIdentity });

				expect(spyToastsShow).toHaveBeenCalledExactlyOnceWith({
					text: replacePlaceholders(get(i18n).init.error.icrc_canister_loading_curated, {
						$tokenSymbol: curatedToken.symbol
					}),
					level: 'warn'
				});
			});

			it('should not show a toast on metadata error if the token was not enabled', async () => {
				backendCanisterMock.listCustomTokens.mockResolvedValue([
					{ ...mockCustomToken, enabled: false }
				]);

				const err = new Error('test');
				ledgerCanisterMock.metadata.mockRejectedValue(err);

				await loadCustomTokens({ identity: mockIdentity });

				expect(spyToastsShow).not.toHaveBeenCalled();
			});

			it('should reset tokens on metadata error', async () => {
				const initialTokens = get(icrcCustomTokensStore);

				expect(initialTokens).toHaveLength(1);

				const err = new Error('test');
				ledgerCanisterMock.metadata.mockRejectedValue(err);

				backendCanisterMock.listCustomTokens.mockResolvedValue([mockCustomToken]);

				await loadCustomTokens({ identity: mockIdentity });

				const afterTokens = get(icrcCustomTokensStore);

				expect(afterTokens).toEqual(initialTokens);

				expect(spyToastsError).not.toHaveBeenCalled();

				expect(trackEvent).toHaveBeenCalledTimes(2);
				expect(trackEvent).toHaveBeenNthCalledWith(1, {
					name: PLAUSIBLE_EVENTS.LOAD_CUSTOM_TOKENS,
					metadata: {
						event_context: PLAUSIBLE_EVENT_CONTEXTS.TOKENS,
						event_subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_TOKENS.ICRC,
						error: err.message
					}
				});
				expect(trackEvent).toHaveBeenNthCalledWith(2, {
					name: PLAUSIBLE_EVENTS.LOAD_CUSTOM_TOKENS,
					metadata: {
						event_context: PLAUSIBLE_EVENT_CONTEXTS.TOKENS,
						event_subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_TOKENS.ICRC,
						error: err.message
					}
				});
			});

			it('should not cache the custom tokens in IDB', async () => {
				const tokens = get(icrcCustomTokensStore);

				expect(tokens).toHaveLength(1);

				const err = new Error('test');
				backendCanisterMock.listCustomTokens.mockRejectedValue(err);

				await loadCustomTokens({ identity: mockIdentity });

				expect(idbKeyval.set).not.toHaveBeenCalled();
			});

			it("should not call onSuccess if there's an error", async () => {
				const tokens = get(icrcCustomTokensStore);

				expect(tokens).toHaveLength(1);

				const err = new Error('test');
				backendCanisterMock.listCustomTokens.mockRejectedValue(err);

				await loadCustomTokens({ identity: mockIdentity });

				expect(mockOnSuccess).not.toHaveBeenCalled();
			});
		});
	});

	describe('saveDefaultEnabledIcrcTokens', () => {
		const tcyclesIndexCanisterId = 'ul4oc-4iaaa-aaaaq-qaabq-cai';

		const mockSavedToken = ({
			ledgerCanisterId,
			enabled
		}: {
			ledgerCanisterId: CanisterIdText;
			enabled: boolean;
		}): CustomToken => ({
			token: {
				Icrc: {
					ledger_id: Principal.fromText(ledgerCanisterId),
					index_id: toNullable()
				}
			},
			version: toNullable(1n),
			enabled,
			section: toNullable(),
			allow_external_content_source: toNullable(),
			allowed_external_content_source_urls: toNullable()
		});

		const mockSavedErc20Token: CustomToken = {
			token: { Erc20: { token_address: mockEthAddress, chain_id: 1n } },
			version: toNullable(1n),
			enabled: true,
			section: toNullable(),
			allow_external_content_source: toNullable(),
			allowed_external_content_source_urls: toNullable()
		};

		let spySetManyCustomTokens: MockInstance<typeof backendApi.setManyCustomTokens>;
		let spyListCustomTokens: MockInstance<typeof backendApi.listCustomTokens>;

		const savedLedgerCanisterIds = (): (string | undefined)[] =>
			(spySetManyCustomTokens.mock.calls[0]?.[0].tokens ?? []).map(({ token }) =>
				'Icrc' in token ? token.Icrc.ledger_id.toText() : undefined
			);

		beforeEach(() => {
			vi.clearAllMocks();

			// A local build, which the tests run as, curates no additional ICRC tokens.
			vi.spyOn(tokensIcrcEnv, 'ICRC_TOKENS', 'get').mockReturnValue([
				{ ledgerCanisterId: TCYCLES_LEDGER_CANISTER_ID, indexCanisterId: tcyclesIndexCanisterId },
				{ ledgerCanisterId: GLDT_LEDGER_CANISTER_ID, indexCanisterId: mockIndexCanisterId }
			]);

			vi.spyOn(
				tokensIcrcAdditionalEnv,
				'ICRC_DEFAULT_ENABLED_LEDGER_CANISTER_IDS',
				'get'
			).mockReturnValue([TCYCLES_LEDGER_CANISTER_ID]);

			spySetManyCustomTokens = vi.spyOn(backendApi, 'setManyCustomTokens').mockResolvedValue();
			spyListCustomTokens = vi.spyOn(backendApi, 'listCustomTokens').mockResolvedValue([]);
		});

		it('should save a default-enabled token the user has no entry for as enabled', async () => {
			await saveDefaultEnabledIcrcTokens({ identity: mockIdentity, certified: true, tokens: [] });

			expect(spySetManyCustomTokens).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tokens: [
					{
						token: {
							Icrc: {
								ledger_id: Principal.fromText(TCYCLES_LEDGER_CANISTER_ID),
								index_id: toNullable(Principal.fromText(tcyclesIndexCanisterId))
							}
						},
						version: toNullable(),
						enabled: true,
						section: toNullable(),
						allow_external_content_source: toNullable(),
						allowed_external_content_source_urls: toNullable()
					}
				]
			});
		});

		it('should save a default-enabled token next to entries for other tokens', async () => {
			await saveDefaultEnabledIcrcTokens({
				identity: mockIdentity,
				certified: true,
				tokens: [
					mockSavedToken({ ledgerCanisterId: mockLedgerCanisterId, enabled: true }),
					mockSavedErc20Token
				]
			});

			expect(savedLedgerCanisterIds()).toEqual([TCYCLES_LEDGER_CANISTER_ID]);
		});

		it.each([
			{ description: 'disabled', enabled: false },
			{ description: 'enabled', enabled: true }
		])('should not save a token the user has $description', async ({ enabled }) => {
			await saveDefaultEnabledIcrcTokens({
				identity: mockIdentity,
				certified: true,
				tokens: [mockSavedToken({ ledgerCanisterId: TCYCLES_LEDGER_CANISTER_ID, enabled })]
			});

			expect(spySetManyCustomTokens).not.toHaveBeenCalled();
			expect(spyListCustomTokens).not.toHaveBeenCalled();
		});

		it('should only save the default-enabled tokens the user has no entry for', async () => {
			vi.spyOn(
				tokensIcrcAdditionalEnv,
				'ICRC_DEFAULT_ENABLED_LEDGER_CANISTER_IDS',
				'get'
			).mockReturnValue([TCYCLES_LEDGER_CANISTER_ID, GLDT_LEDGER_CANISTER_ID]);

			await saveDefaultEnabledIcrcTokens({
				identity: mockIdentity,
				certified: true,
				tokens: [mockSavedToken({ ledgerCanisterId: TCYCLES_LEDGER_CANISTER_ID, enabled: false })]
			});

			expect(savedLedgerCanisterIds()).toEqual([GLDT_LEDGER_CANISTER_ID]);
		});

		it('should not save a default-enabled token this build does not curate', async () => {
			vi.spyOn(tokensIcrcEnv, 'ICRC_TOKENS', 'get').mockReturnValue([]);

			await saveDefaultEnabledIcrcTokens({ identity: mockIdentity, certified: true, tokens: [] });

			expect(spySetManyCustomTokens).not.toHaveBeenCalled();
		});

		it('should not save when no token is enabled by default', async () => {
			vi.spyOn(
				tokensIcrcAdditionalEnv,
				'ICRC_DEFAULT_ENABLED_LEDGER_CANISTER_IDS',
				'get'
			).mockReturnValue([]);

			await saveDefaultEnabledIcrcTokens({ identity: mockIdentity, certified: true, tokens: [] });

			expect(spySetManyCustomTokens).not.toHaveBeenCalled();
		});

		it('should not save on the uncertified token list', async () => {
			await saveDefaultEnabledIcrcTokens({ identity: mockIdentity, certified: false, tokens: [] });

			expect(spySetManyCustomTokens).not.toHaveBeenCalled();
		});

		it('should not save without a token list', async () => {
			await saveDefaultEnabledIcrcTokens({ identity: mockIdentity, certified: true });

			expect(spySetManyCustomTokens).not.toHaveBeenCalled();
		});

		it('should not save without an identity', async () => {
			await saveDefaultEnabledIcrcTokens({ identity: null, certified: true, tokens: [] });

			expect(spySetManyCustomTokens).not.toHaveBeenCalled();
		});

		it('should reload the ICRC custom tokens after the save', async () => {
			await saveDefaultEnabledIcrcTokens({ identity: mockIdentity, certified: true, tokens: [] });

			expect(spyListCustomTokens).toHaveBeenCalled();

			const [saveOrder] = spySetManyCustomTokens.mock.invocationCallOrder;
			const [reloadOrder] = spyListCustomTokens.mock.invocationCallOrder;

			expect(saveOrder).toBeLessThan(reloadOrder);
		});

		it('should neither throw, reload nor toast when the save fails', async () => {
			const spyToastsError = vi.spyOn(toastsStore, 'toastsError');

			spySetManyCustomTokens.mockRejectedValueOnce(new Error('Version mismatch'));

			await expect(
				saveDefaultEnabledIcrcTokens({ identity: mockIdentity, certified: true, tokens: [] })
			).resolves.toBeUndefined();

			expect(spyListCustomTokens).not.toHaveBeenCalled();
			expect(spyToastsError).not.toHaveBeenCalled();
		});
	});

	describe('loadDisabledIcrcTokensExchanges', () => {
		const erc20Exchange = {
			[mockEthAddress]: {
				usd: 1,
				usd_market_cap: 1
			}
		};

		const icrcExchange = {
			[mockIcrcCustomToken.ledgerCanisterId]: {
				usd: 2,
				usd_market_cap: 2
			}
		};

		beforeEach(() => {
			vi.resetAllMocks();

			exchangeStore.reset();
			vi.spyOn(exchangeServices, 'exchangeRateERC20ToUsd').mockResolvedValue(erc20Exchange);
			vi.spyOn(exchangeServices, 'exchangeRateICRCToUsd').mockResolvedValue(icrcExchange);
		});

		it('should load tokens exchanges for the provided tokens', async () => {
			await loadDisabledIcrcTokensExchanges({
				disabledIcrcTokens
			});

			expect(get(exchangeStore)).toStrictEqual({ ...icrcExchange, ...erc20Exchange });
		});

		it('should never ask for a market price of TCYCLES', async () => {
			await loadDisabledIcrcTokensExchanges({ disabledIcrcTokens });

			const [[withoutTcycles]] = vi.mocked(exchangeServices.exchangeRateICRCToUsd).mock.calls;

			vi.mocked(exchangeServices.exchangeRateICRCToUsd).mockClear();

			await loadDisabledIcrcTokensExchanges({
				disabledIcrcTokens: [
					...disabledIcrcTokens,
					{
						...mockIcrcCustomToken,
						id: parseTokenId('TCYCLES'),
						ledgerCanisterId: TCYCLES_LEDGER_CANISTER_ID
					}
				]
			});

			expect(exchangeServices.exchangeRateICRCToUsd).toHaveBeenCalledExactlyOnceWith(
				withoutTcycles
			);
			expect(withoutTcycles).not.toContain(TCYCLES_LEDGER_CANISTER_ID);
		});
	});

	describe('loadDisabledIcrcTokensBalances', () => {
		const balance = 1_000_000n;

		beforeEach(() => {
			vi.clearAllMocks();

			const ledgerCanisterMock = mock<IcrcLedgerCanister>();
			vi.spyOn(IcrcLedgerCanister, 'create').mockImplementation(() => ledgerCanisterMock);

			ledgerCanisterMock.balance.mockResolvedValue(balance);
		});

		it('should load tokens balances for the provided tokens', async () => {
			await loadDisabledIcrcTokensBalances({
				identity: mockIdentity,
				disabledIcrcTokens
			});

			await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

			expect(get(balancesStore)).toEqual({
				[disabledIcrcTokens[0].id]: {
					certified: true,
					data: balance
				},
				[disabledIcrcTokens[1].id]: {
					certified: true,
					data: balance
				}
			});
		});
	});

	describe('hasSufficientIcrcAllowance', () => {
		const mockOwner = Principal.fromText('aaaaa-aa');
		const mockSpender = Principal.fromText('l4lgk-raaaa-aaaar-qahpq-cai');
		const mockAmount = 1_000_000n;
		const mockNow = nowInBigIntNanoSeconds();

		const ledgerCanisterMock = mock<IcrcLedgerCanister>();

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(IcrcLedgerCanister, 'create').mockImplementation(() => ledgerCanisterMock);
		});

		it('should return true when allowance is sufficient and not expired', async () => {
			const futureExpiration = mockNow + 60_000_000_000n;

			ledgerCanisterMock.allowance.mockResolvedValue({
				allowance: 2_000_000n,
				expires_at: [futureExpiration]
			});

			const result = await hasSufficientIcrcAllowance({
				identity: mockIdentity,
				ledgerCanisterId: mockLedgerCanisterId,
				owner: mockOwner,
				spender: mockSpender,
				amount: mockAmount
			});

			expect(result).toBeTruthy();
		});

		it('should return true when allowance is exactly equal to required amount', async () => {
			const futureExpiration = mockNow + 60_000_000_000n;

			ledgerCanisterMock.allowance.mockResolvedValue({
				allowance: mockAmount,
				expires_at: [futureExpiration]
			});

			const result = await hasSufficientIcrcAllowance({
				identity: mockIdentity,
				ledgerCanisterId: mockLedgerCanisterId,
				owner: mockOwner,
				spender: mockSpender,
				amount: mockAmount
			});

			expect(result).toBeTruthy();
		});

		it('should return true when allowance has no expiration and no buffer is provided', async () => {
			ledgerCanisterMock.allowance.mockResolvedValue({
				allowance: 2_000_000n,
				expires_at: []
			});

			const result = await hasSufficientIcrcAllowance({
				identity: mockIdentity,
				ledgerCanisterId: mockLedgerCanisterId,
				owner: mockOwner,
				spender: mockSpender,
				amount: mockAmount
			});

			expect(result).toBeTruthy();
		});

		it('should return false when allowance is insufficient', async () => {
			const futureExpiration = mockNow + 60_000_000_000n;

			ledgerCanisterMock.allowance.mockResolvedValue({
				allowance: 500_000n,
				expires_at: [futureExpiration]
			});

			const result = await hasSufficientIcrcAllowance({
				identity: mockIdentity,
				ledgerCanisterId: mockLedgerCanisterId,
				owner: mockOwner,
				spender: mockSpender,
				amount: mockAmount
			});

			expect(result).toBeFalsy();
		});

		it('should return false when allowance is expired', async () => {
			const pastExpiration = mockNow - 10_000_000_000n;

			ledgerCanisterMock.allowance.mockResolvedValue({
				allowance: 2_000_000n,
				expires_at: [pastExpiration]
			});

			const result = await hasSufficientIcrcAllowance({
				identity: mockIdentity,
				ledgerCanisterId: mockLedgerCanisterId,
				owner: mockOwner,
				spender: mockSpender,
				amount: mockAmount,
				allowanceBuffer: pastExpiration
			});

			expect(result).toBeFalsy();
		});

		it('should return false when allowance expires within buffer period', async () => {
			const expirationWithinBuffer = mockNow + 15_000_000_000n;

			ledgerCanisterMock.allowance.mockResolvedValue({
				allowance: 2_000_000n,
				expires_at: [expirationWithinBuffer]
			});

			const result = await hasSufficientIcrcAllowance({
				identity: mockIdentity,
				ledgerCanisterId: mockLedgerCanisterId,
				owner: mockOwner,
				spender: mockSpender,
				amount: mockAmount,
				allowanceBuffer: expirationWithinBuffer
			});

			expect(result).toBeFalsy();
		});

		it('should return false when allowance is zero', async () => {
			const futureExpiration = mockNow + 60_000_000_000n;

			ledgerCanisterMock.allowance.mockResolvedValue({
				allowance: ZERO,
				expires_at: [futureExpiration]
			});

			const result = await hasSufficientIcrcAllowance({
				identity: mockIdentity,
				ledgerCanisterId: mockLedgerCanisterId,
				owner: mockOwner,
				spender: mockSpender,
				amount: mockAmount
			});

			expect(result).toBeFalsy();
		});

		it('should thow an error when allowance call throws an error', async () => {
			const err = new Error('test');
			ledgerCanisterMock.allowance.mockRejectedValue(err);

			await expect(
				hasSufficientIcrcAllowance({
					identity: mockIdentity,
					ledgerCanisterId: mockLedgerCanisterId,
					owner: mockOwner,
					spender: mockSpender,
					amount: mockAmount
				})
			).rejects.toThrow(err);
		});
	});

	describe('isIcrcTokenSupportIcrc2', () => {
		const ledgerCanisterMock = mock<IcrcLedgerCanister>();

		const params = {
			identity: mockIdentity,
			ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID
		};

		const expectedParams = { certified: true };

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(IcrcLedgerCanister, 'create').mockImplementation(() => ledgerCanisterMock);
		});

		it('returns true when ICRC-2 standard is supported', async () => {
			const supportedStandards: IcrcLedgerDid.StandardRecord[] = [
				{ name: 'ICRC-1', url: 'https://github.com/dfinity/ICRC-1' },
				{ name: 'ICRC-2', url: 'https://github.com/dfinity/ICRC-2' },
				{ name: 'ICRC-3', url: 'https://github.com/dfinity/ICRC-3' }
			];

			vi.mocked(ledgerCanisterMock.icrc1SupportedStandards).mockResolvedValue(supportedStandards);

			const result = await isIcrcTokenSupportIcrc2(params);

			expect(result).toBeTruthy();
			expect(ledgerCanisterMock.icrc1SupportedStandards).toHaveBeenCalledExactlyOnceWith(
				expectedParams
			);
		});

		it('returns false when ICRC-2 standard is not supported', async () => {
			const supportedStandards = [
				{ name: 'ICRC-1', url: 'https://github.com/dfinity/ICRC-1' },
				{ name: 'ICRC-3', url: 'https://github.com/dfinity/ICRC-3' }
			];

			vi.mocked(ledgerCanisterMock.icrc1SupportedStandards).mockResolvedValue(supportedStandards);

			const result = await isIcrcTokenSupportIcrc2(params);

			expect(result).toBeFalsy();
			expect(ledgerCanisterMock.icrc1SupportedStandards).toHaveBeenCalledExactlyOnceWith(
				expectedParams
			);
		});

		it('returns false when no standards are supported', async () => {
			const supportedStandards: [] = [];

			vi.mocked(ledgerCanisterMock.icrc1SupportedStandards).mockResolvedValue(supportedStandards);

			const result = await isIcrcTokenSupportIcrc2(params);

			expect(result).toBeFalsy();
			expect(ledgerCanisterMock.icrc1SupportedStandards).toHaveBeenCalledExactlyOnceWith(
				expectedParams
			);
		});

		it('returns true when only ICRC-2 is supported', async () => {
			const supportedStandards = [{ name: 'ICRC-2', url: 'https://github.com/dfinity/ICRC-2' }];

			vi.mocked(ledgerCanisterMock.icrc1SupportedStandards).mockResolvedValue(supportedStandards);

			const result = await isIcrcTokenSupportIcrc2(params);

			expect(result).toBeTruthy();
			expect(ledgerCanisterMock.icrc1SupportedStandards).toHaveBeenCalledExactlyOnceWith(
				expectedParams
			);
		});
	});

	describe('isIcrcTokenSupportIcrc3', () => {
		const ledgerCanisterMock = mock<IcrcLedgerCanister>();

		// The answer is kept per ledger for the session, so every test asks about its own ledger.
		const params = (ledgerCanisterId: string) => ({ identity: mockIdentity, ledgerCanisterId });

		const expectedParams = { certified: false };

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(IcrcLedgerCanister, 'create').mockImplementation(() => ledgerCanisterMock);
		});

		it('returns true when ICRC-3 standard is supported', async () => {
			vi.mocked(ledgerCanisterMock.icrc1SupportedStandards).mockResolvedValue([
				{ name: 'ICRC-1', url: 'https://github.com/dfinity/ICRC-1' },
				{ name: 'ICRC-2', url: 'https://github.com/dfinity/ICRC-2' },
				{ name: 'ICRC-3', url: 'https://github.com/dfinity/ICRC-3' }
			]);

			const result = await isIcrcTokenSupportIcrc3(params('2ouva-viaaa-aaaaq-aaamq-cai'));

			expect(result).toBeTruthy();
			expect(ledgerCanisterMock.icrc1SupportedStandards).toHaveBeenCalledExactlyOnceWith(
				expectedParams
			);
		});

		it('returns false when ICRC-3 standard is not supported', async () => {
			vi.mocked(ledgerCanisterMock.icrc1SupportedStandards).mockResolvedValue([
				{ name: 'ICRC-1', url: 'https://github.com/dfinity/ICRC-1' },
				{ name: 'ICRC-2', url: 'https://github.com/dfinity/ICRC-2' }
			]);

			const result = await isIcrcTokenSupportIcrc3(params('eig2s-waaaa-aaaam-qbg5a-cai'));

			expect(result).toBeFalsy();
		});

		it('asks each ledger only once', async () => {
			vi.mocked(ledgerCanisterMock.icrc1SupportedStandards).mockResolvedValue([
				{ name: 'ICRC-3', url: 'https://github.com/dfinity/ICRC-3' }
			]);

			const first = await isIcrcTokenSupportIcrc3(params('um5iw-rqaaa-aaaaq-qaaba-cai'));
			const second = await isIcrcTokenSupportIcrc3(params('um5iw-rqaaa-aaaaq-qaaba-cai'));

			expect(first).toBeTruthy();
			expect(second).toBeTruthy();
			expect(ledgerCanisterMock.icrc1SupportedStandards).toHaveBeenCalledOnce();
		});

		it('asks the ledger again after a failed call', async () => {
			const err = new Error('ledger unreachable');

			vi.mocked(ledgerCanisterMock.icrc1SupportedStandards)
				.mockRejectedValueOnce(err)
				.mockResolvedValueOnce([{ name: 'ICRC-3', url: 'https://github.com/dfinity/ICRC-3' }]);

			await expect(isIcrcTokenSupportIcrc3(params('rh2pm-ryaaa-aaaan-qeniq-cai'))).rejects.toThrow(
				err
			);

			const result = await isIcrcTokenSupportIcrc3(params('rh2pm-ryaaa-aaaan-qeniq-cai'));

			expect(result).toBeTruthy();
			expect(ledgerCanisterMock.icrc1SupportedStandards).toHaveBeenCalledTimes(2);
		});
	});
});
