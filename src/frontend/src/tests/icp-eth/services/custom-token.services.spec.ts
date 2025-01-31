import {
	IC_CKBTC_INDEX_CANISTER_ID,
	IC_CKBTC_LEDGER_CANISTER_ID
} from '$env/networks/networks.icrc.env';
import {
	autoLoadCustomToken,
	setCustomToken,
	toCustomToken
} from '$icp-eth/services/custom-token.services';
import type { SaveCustomToken } from '$icp/services/ic-custom-tokens.services';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import * as agent from '$lib/actors/agents.ic';
import { BackendCanister } from '$lib/canisters/backend.canister';
import { i18n } from '$lib/stores/i18n.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIcrcCustomToken, mockIcrcCustomTokens } from '$tests/mocks/icrc-custom-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockValidToken } from '$tests/mocks/tokens.mock';
import type { HttpAgent } from '@dfinity/agent';
import { IcrcLedgerCanister } from '@dfinity/ledger-icrc';
import { Principal } from '@dfinity/principal';
import { isNullish, toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

describe('custom-token.services', () => {
	const backendCanisterMock = mock<BackendCanister>();
	const ledgerCanisterMock = mock<IcrcLedgerCanister>();

	let spyToastsError: MockInstance;

	// we mock console.error just to avoid unnecessary logs while running the tests
	vi.spyOn(console, 'error').mockImplementation(() => {});

	beforeEach(() => {
		vi.clearAllMocks();

		// eslint-disable-next-line require-await
		vi.spyOn(BackendCanister, 'create').mockImplementation(async () => backendCanisterMock);

		vi.spyOn(IcrcLedgerCanister, 'create').mockImplementation(() => ledgerCanisterMock);

		vi.spyOn(agent, 'getAgent').mockResolvedValue(mock<HttpAgent>());

		spyToastsError = vi.spyOn(toastsStore, 'toastsError');
	});

	describe('autoLoadCustomToken', () => {
		const mockValidSendToken = {
			...mockValidIcToken,
			twinTokenSymbol: mockIcrcCustomTokens[0].symbol,
			standard: 'erc20' as const
		};

		it('should return "skipped" when the token standard does not match', async () => {
			const result = await autoLoadCustomToken({
				icrcCustomTokens: mockIcrcCustomTokens,
				sendToken: mockValidToken,
				identity: mockIdentity
			});

			expect(result.result).toBe('skipped');
		});

		describe('success', () => {
			const assertSetCustomToken = async ({
				customTokens,
				expectedVersion,
				indexCanisterId
			}: {
				customTokens: IcrcCustomToken[];
				expectedVersion: [] | [bigint];
				indexCanisterId: string | undefined;
			}) => {
				const spySetCustomToken = backendCanisterMock.setCustomToken.mockResolvedValue(undefined);
				const spyListCustomTokens = backendCanisterMock.listCustomTokens.mockResolvedValue([]);

				const mockSendToken = {
					...mockValidIcToken,
					twinTokenSymbol: customTokens[0].symbol,
					standard: 'erc20' as const
				};

				const [first, ...rest] = customTokens;
				const icrcCustomTokens = [{ ...first, indexCanisterId }, ...rest];

				const { result } = await autoLoadCustomToken({
					icrcCustomTokens,
					sendToken: mockSendToken,
					identity: mockIdentity
				});

				expect(result).toBe('loaded');

				expect(spySetCustomToken).toHaveBeenNthCalledWith(1, {
					token: {
						enabled: true,
						version: expectedVersion,
						token: {
							Icrc: {
								index_id: isNullish(indexCanisterId) ? [] : [Principal.fromText(indexCanisterId)],
								ledger_id: Principal.fromText(mockSendToken.ledgerCanisterId)
							}
						}
					}
				});

				expect(spyListCustomTokens).toHaveBeenCalledWith({ certified: true });
			};

			it.each([undefined, IC_CKBTC_INDEX_CANISTER_ID])(
				'should call setCustomToken with a new custom token with index %s',
				async (indexCanisterId) => {
					await assertSetCustomToken({
						customTokens: mockIcrcCustomTokens,
						expectedVersion: [],
						indexCanisterId
					});
				}
			);

			it.each([undefined, IC_CKBTC_INDEX_CANISTER_ID])(
				'should call setCustomToken to update a custom token with index %s',
				async (indexCanisterId) => {
					const customTokens: IcrcCustomToken[] = [
						{
							...mockIcrcCustomTokens[0],
							version: 1n
						},
						mockIcrcCustomTokens[1]
					];

					await assertSetCustomToken({
						customTokens,
						expectedVersion: [customTokens[0].version ?? 0n],
						indexCanisterId
					});
				}
			);

			it.each([undefined, IC_CKBTC_INDEX_CANISTER_ID])(
				'should load tokens after set custom token with index ID %s',
				async (indexCanisterId) => {
					backendCanisterMock.setCustomToken.mockResolvedValue(undefined);
					const spyListCustomTokens = backendCanisterMock.listCustomTokens.mockResolvedValue([
						{
							token: {
								Icrc: {
									index_id: isNullish(indexCanisterId) ? [] : [Principal.fromText(indexCanisterId)],
									ledger_id: Principal.fromText(mockValidSendToken.ledgerCanisterId)
								}
							},
							version: [1n],
							enabled: true
						}
					]);

					const spyMetadata = ledgerCanisterMock.metadata.mockResolvedValue([
						['icrc1:name', { Text: mockValidSendToken.name }],
						['icrc1:symbol', { Text: mockValidSendToken.symbol }],
						['icrc1:decimals', { Nat: BigInt(mockValidSendToken.decimals) }],
						['icrc1:fee', { Nat: mockValidSendToken.fee }]
					]);

					const { result } = await autoLoadCustomToken({
						icrcCustomTokens: mockIcrcCustomTokens,
						sendToken: mockValidSendToken,
						identity: mockIdentity
					});

					expect(result).toBe('loaded');

					expect(spyListCustomTokens).toHaveBeenCalledWith({ certified: true });

					expect(spyMetadata).toHaveBeenCalledWith({ certified: true });

					const store = get(icrcCustomTokensStore);

					expect(store).toHaveLength(1);
					expect(store).toEqual([
						{
							certified: true,
							data: expect.objectContaining({
								...mockValidIcToken,
								id: expect.any(Symbol),
								category: 'custom',
								position: 4,
								enabled: true,
								standard: 'icrc',
								version: 1n
							})
						}
					]);
				}
			);
		});

		describe('error', () => {
			it('should result in error if setCustomToken fails', async () => {
				const err = new Error('test');
				backendCanisterMock.setCustomToken.mockRejectedValue(err);

				backendCanisterMock.listCustomTokens.mockResolvedValue([]);

				const { result } = await autoLoadCustomToken({
					icrcCustomTokens: mockIcrcCustomTokens,
					sendToken: mockValidSendToken,
					identity: mockIdentity
				});

				expect(result).toBe('error');

				expect(spyToastsError).toHaveBeenNthCalledWith(1, {
					msg: { text: get(i18n).init.error.icrc_custom_token },
					err
				});
			});

			it('should result with loaded but toastError if listCustomTokens fails', async () => {
				backendCanisterMock.setCustomToken.mockResolvedValue(undefined);

				const err = new Error('test');
				backendCanisterMock.listCustomTokens.mockRejectedValue(err);

				const { result } = await autoLoadCustomToken({
					icrcCustomTokens: mockIcrcCustomTokens,
					sendToken: mockValidSendToken,
					identity: mockIdentity
				});

				expect(result).toBe('loaded');

				expect(spyToastsError).toHaveBeenNthCalledWith(1, {
					msg: { text: get(i18n).init.error.icrc_canisters },
					err
				});
			});

			it.each([undefined, IC_CKBTC_INDEX_CANISTER_ID])(
				'should result with loaded but toastError if metadata fails with index ID %s',
				async (indexCanisterId) => {
					backendCanisterMock.setCustomToken.mockResolvedValue(undefined);

					backendCanisterMock.listCustomTokens.mockResolvedValue([
						{
							token: {
								Icrc: {
									index_id: isNullish(indexCanisterId) ? [] : [Principal.fromText(indexCanisterId)],
									ledger_id: Principal.fromText(mockValidSendToken.ledgerCanisterId)
								}
							},
							version: [1n],
							enabled: true
						}
					]);

					const err = new Error('test');
					ledgerCanisterMock.metadata.mockRejectedValue(err);

					const { result } = await autoLoadCustomToken({
						icrcCustomTokens: mockIcrcCustomTokens,
						sendToken: mockValidSendToken,
						identity: mockIdentity
					});

					expect(result).toBe('loaded');

					expect(spyToastsError).toHaveBeenNthCalledWith(1, {
						msg: { text: get(i18n).init.error.icrc_canisters },
						err
					});
				}
			);
		});
	});

	describe('toCustomToken', () => {
		describe.each([undefined, IC_CKBTC_INDEX_CANISTER_ID])(
			'with index ID %s',
			(indexCanisterId) => {
				it.each([undefined, 2n])('should convert to CustomToken with version %s', (version) => {
					const input: SaveCustomToken = {
						enabled: true,
						version,
						ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
						indexCanisterId
					};

					const result = toCustomToken(input);

					expect(result).toEqual({
						enabled: input.enabled,
						version: toNullable(version),
						token: {
							Icrc: {
								ledger_id: Principal.fromText(input.ledgerCanisterId),
								index_id: toNullable(
									isNullish(indexCanisterId) ? undefined : Principal.fromText(indexCanisterId)
								)
							}
						}
					});
				});
			}
		);
	});

	describe('setCustomToken', () => {
		describe.each([undefined, IC_CKBTC_INDEX_CANISTER_ID])(
			'with index ID %s',
			(indexCanisterId) => {
				it('should call backend setCustomToken with expected parameters', async () => {
					const spySetCustomToken = backendCanisterMock.setCustomToken.mockResolvedValue(undefined);

					const enabled = true;

					await setCustomToken({
						token: {
							...mockIcrcCustomToken,
							indexCanisterId
						},
						identity: mockIdentity,
						enabled
					});

					expect(spySetCustomToken).toHaveBeenCalledWith({
						token: {
							enabled,
							version: toNullable(mockIcrcCustomToken.version),
							token: {
								Icrc: {
									ledger_id: Principal.fromText(mockIcrcCustomToken.ledgerCanisterId),
									index_id: toNullable(
										isNullish(indexCanisterId) ? undefined : Principal.fromText(indexCanisterId)
									)
								}
							}
						}
					});
				});
			}
		);
	});
});
