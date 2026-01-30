import type { CustomToken } from '$declarations/backend/backend.did';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { IC_CKBTC_LEDGER_CANISTER_ID } from '$env/tokens/tokens-icp/tokens.icp.ck.btc.env';
import {
	hasSufficientIcrcAllowance,
	isIcrcTokenSupportIcrc2,
	loadCustomTokens,
	loadDisabledIcrcTokensBalances,
	loadDisabledIcrcTokensExchanges
} from '$icp/services/icrc.services';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import { nowInBigIntNanoSeconds } from '$icp/utils/date.utils';
import { BackendCanister } from '$lib/canisters/backend.canister';
import { TRACK_COUNT_IC_LOADING_ICRC_CANISTER_ERROR } from '$lib/constants/analytics.constants';
import { ZERO } from '$lib/constants/app.constants';
import {
	PLAUSIBLE_EVENTS,
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_SUBCONTEXT_TOKENS
} from '$lib/enums/plausible';
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
import { fromNullable, nonNullish, toNullable } from '@dfinity/utils';
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
			allow_external_content_source: toNullable(true)
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
					allow_external_content_source: toNullable(true)
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
					allow_external_content_source: toNullable(false)
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
				expect(spyListCustomTokens).toHaveBeenNthCalledWith(1, {
					certified: false
				});
				expect(spyListCustomTokens).toHaveBeenNthCalledWith(2, {
					certified: true
				});
			});

			it('should cache the custom tokens in IDB on update call', async () => {
				backendCanisterMock.listCustomTokens.mockResolvedValue([mockCustomToken]);

				await testLoadCustomTokens({ mockCustomToken, ledgerCanisterId: mockLedgerCanisterId });

				expect(idbKeyval.set).toHaveBeenCalledOnce();
				expect(idbKeyval.set).toHaveBeenNthCalledWith(
					1,
					mockIdentity.getPrincipal().toText(),
					[mockCustomToken],
					expect.any(Object)
				);
			});

			it('should fetch the cached custom tokens in IDB on query call', async () => {
				await loadCustomTokens({ identity: mockIdentity, useCache: true });

				expect(idbKeyval.get).toHaveBeenCalledOnce();
				expect(idbKeyval.get).toHaveBeenNthCalledWith(
					1,
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

				expect(spyToastsError).toHaveBeenNthCalledWith(1, {
					msg: { text: get(i18n).init.error.icrc_canisters },
					err
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

				expect(console.error).toHaveBeenCalledTimes(2);
				expect(console.error).toHaveBeenNthCalledWith(1, err);
				expect(console.error).toHaveBeenNthCalledWith(2, err);
			});

			it('should show a toast on metadata error if the token was enabled', async () => {
				backendCanisterMock.listCustomTokens.mockResolvedValue([
					{ ...mockCustomToken, enabled: true }
				]);

				const err = new Error('test');
				ledgerCanisterMock.metadata.mockRejectedValue(err);

				await loadCustomTokens({ identity: mockIdentity });

				expect(spyToastsShow).toHaveBeenCalledExactlyOnceWith({
					text: replacePlaceholders(get(i18n).init.error.icrc_canister_loading, {
						$ledgerCanisterId: mockLedgerCanisterId
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

				backendCanisterMock.listCustomTokens.mockResolvedValue([mockCustomToken]);

				await loadCustomTokens({ identity: mockIdentity });

				const tokens = get(icrcCustomTokensStore);

				expect(tokens).toHaveLength(2);

				const err = new Error('test');
				ledgerCanisterMock.metadata.mockRejectedValue(err);

				await loadCustomTokens({ identity: mockIdentity });

				const afterTokens = get(icrcCustomTokensStore);

				expect(afterTokens).toEqual(initialTokens);

				expect(spyToastsError).not.toHaveBeenCalled();

				expect(console.error).toHaveBeenCalledTimes(2);
				expect(console.error).toHaveBeenNthCalledWith(1, err);
				expect(console.error).toHaveBeenNthCalledWith(2, err);
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
			).rejects.toThrowError(err);
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
});
