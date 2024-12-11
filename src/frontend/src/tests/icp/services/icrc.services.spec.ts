import type { CustomToken } from '$declarations/backend/backend.did';
import { ICP_NETWORK } from '$env/networks/networks.env';
import { loadCustomTokens } from '$icp/services/icrc.services';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import * as agent from '$lib/actors/agents.ic';
import { BackendCanister } from '$lib/canisters/backend.canister';
import { i18n } from '$lib/stores/i18n.store';
import * as toastsStore from '$lib/stores/toasts.store';
import type { CanisterIdText } from '$lib/types/canister';
import { mockIcrcCustomToken } from '$tests/mocks/icrc-custom-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { HttpAgent } from '@dfinity/agent';
import { IcrcLedgerCanister } from '@dfinity/ledger-icrc';
import { Principal } from '@dfinity/principal';
import { fromNullable, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';
import { type MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

describe('icrc.services', () => {
	const mockLedgerCanisterId = 'bw4dl-smaaa-aaaaa-qaacq-cai';
	const mockIndexCanisterId = 'b77ix-eeaaa-aaaaa-qaada-cai';

	describe('loadCustomTokens', () => {
		const ledgerCanisterMock = mock<IcrcLedgerCanister>();
		const backendCanisterMock = mock<BackendCanister>();

		const mockDecimals = 22n;
		const mockFee = 456n;
		const mockName = 'Test';
		const mockSymbol = 'TST';

		const mockCustomToken: CustomToken = {
			token: {
				Icrc: {
					index_id: [Principal.fromText(mockIndexCanisterId)],
					ledger_id: Principal.fromText(mockLedgerCanisterId)
				}
			},
			version: [1n],
			enabled: true
		};

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(IcrcLedgerCanister, 'create').mockImplementation(() => ledgerCanisterMock);

			// eslint-disable-next-line require-await
			vi.spyOn(BackendCanister, 'create').mockImplementation(async () => backendCanisterMock);

			vi.spyOn(agent, 'getAgent').mockResolvedValue(mock<HttpAgent>());

			icrcCustomTokensStore.resetAll();
		});

		describe('success', () => {
			let spyMetadata: MockInstance;

			beforeEach(() => {
				spyMetadata = ledgerCanisterMock.metadata.mockResolvedValue([
					['icrc1:name', { Text: mockName }],
					['icrc1:symbol', { Text: mockSymbol }],
					['icrc1:decimals', { Nat: mockDecimals }],
					['icrc1:fee', { Nat: mockFee }]
				]);
			});

			const testLoadCustomTokens = async ({
				mockCustomToken,
				ledgerCanisterId
			}: {
				mockCustomToken: CustomToken;
				ledgerCanisterId: CanisterIdText;
			}) => {
				await loadCustomTokens({ identity: mockIdentity });

				const tokens = get(icrcCustomTokensStore);

				const token = (tokens ?? []).find(
					({ data: { ledgerCanisterId: tokenLedgerId } }) => tokenLedgerId === ledgerCanisterId
				);

				expect(token).not.toBeNull();
				expect(token).toEqual({
					certified: true,
					data: expect.objectContaining({
						category: 'custom',
						decimals: Number(mockDecimals),
						enabled: true,
						fee: mockFee,
						id: expect.any(Symbol),
						...(nonNullish(fromNullable(mockCustomToken.token.Icrc.index_id)) && {
							indexCanisterId: mockIndexCanisterId
						}),
						ledgerCanisterId: mockLedgerCanisterId,
						name: mockName,
						network: ICP_NETWORK,
						position: 4,
						standard: 'icrc',
						symbol: mockSymbol,
						version: fromNullable(mockCustomToken.version)
					})
				});
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
					enabled: true
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
					enabled: true
				};

				backendCanisterMock.listCustomTokens.mockResolvedValue([mockCustomToken]);

				await loadCustomTokens({ identity: mockIdentity });

				const tokens = get(icrcCustomTokensStore);

				const token = (tokens ?? []).find(
					({ data: { ledgerCanisterId: tokenLedgerId } }) =>
						tokenLedgerId === dragginzLedgerCanisterId
				);

				expect(token).toEqual({
					certified: true,
					data: expect.objectContaining({
						alternativeName: 'Dragginz',
						explorerUrl: 'https://dashboard.internetcomputer.org/sns/zxeu2-7aaaa-aaaaq-aaafa-cai',
						fee: 100000n,
						icon: '/icons/sns/zfcdd-tqaaa-aaaaq-aaaga-cai.png',
						indexCanisterId: dragginzIndexCanisterId,
						ledgerCanisterId: dragginzLedgerCanisterId,
						name: 'Draggin Karma Points'
					})
				});

				expect(spyMetadata).not.toHaveBeenCalled();
			});

			it('should call metadata with query and certified', async () => {
				backendCanisterMock.listCustomTokens.mockResolvedValue([mockCustomToken]);

				await testLoadCustomTokens({ mockCustomToken, ledgerCanisterId: mockLedgerCanisterId });

				expect(spyMetadata).toHaveBeenCalledWith({
					certified: false
				});

				expect(spyMetadata).toHaveBeenCalledWith({
					certified: true
				});
			});

			it('should call list custom tokens with query and certified', async () => {
				const spyListCustomTokens = backendCanisterMock.listCustomTokens.mockResolvedValue([
					mockCustomToken
				]);

				await testLoadCustomTokens({ mockCustomToken, ledgerCanisterId: mockLedgerCanisterId });

				expect(spyListCustomTokens).toHaveBeenCalledWith({
					certified: false
				});

				expect(spyListCustomTokens).toHaveBeenCalledWith({
					certified: true
				});
			});
		});

		describe('error', () => {
			let spyToastsError: MockInstance;

			beforeEach(() => {
				icrcCustomTokensStore.set({
					data: mockIcrcCustomToken,
					certified: true
				});

				vi.spyOn(console, 'error').mockImplementation(() => {});

				spyToastsError = vi.spyOn(toastsStore, 'toastsError');
			});

			const testToastsError = (err: Error) => {
				expect(spyToastsError).toHaveBeenNthCalledWith(1, {
					msg: { text: get(i18n).init.error.icrc_canisters },
					err
				});
			};

			it('should reset all and toasts on list custom tokens error', async () => {
				const tokens = get(icrcCustomTokensStore);
				expect(tokens).toHaveLength(1);

				const err = new Error('test');
				backendCanisterMock.listCustomTokens.mockRejectedValue(err);

				await loadCustomTokens({ identity: mockIdentity });

				const afterTokens = get(icrcCustomTokensStore);
				expect(afterTokens).toBeNull();

				testToastsError(err);
			});

			it('should reset all and toasts on metadata error', async () => {
				backendCanisterMock.listCustomTokens.mockResolvedValue([mockCustomToken]);

				const err = new Error('test');
				ledgerCanisterMock.metadata.mockRejectedValue(err);

				await loadCustomTokens({ identity: mockIdentity });

				const afterTokens = get(icrcCustomTokensStore);
				expect(afterTokens).toBeNull();

				testToastsError(err);
			});
		});
	});
});
