import { ICP_LEDGER_CANISTER_ID, ICP_NETWORK } from '$env/networks/networks.icp.env';
import { loadAndAssertAddCustomToken } from '$icp/services/ic-add-custom-tokens.service';
import type { IcCanisters, IcToken } from '$icp/types/ic-token';
import { getIcrcAccount } from '$icp/utils/icrc-account.utils';
import { ZERO } from '$lib/constants/app.constants';
import { i18n } from '$lib/stores/i18n.store';
import * as toastsStore from '$lib/stores/toasts.store';
import type { OptionIdentity } from '$lib/types/identity';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import { IcrcIndexNgCanister, IcrcLedgerCanister } from '@dfinity/ledger-icrc';
import { Principal } from '@dfinity/principal';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

describe('ic-add-custom-tokens.service', () => {
	describe('loadAndAssertAddCustomToken', () => {
		const ledgerCanisterMock = mock<IcrcLedgerCanister>();
		const indexCanisterMock = mock<IcrcIndexNgCanister>();

		const mockLedgerCanisterId = 'zfcdd-tqaaa-aaaaq-aaaga-cai';
		const mockIndexCanisterId = 'zlaol-iaaaa-aaaaq-aaaha-cai';

		let spyLedgerCreate: MockInstance;
		let spyIndexCreate: MockInstance;

		let spyToastsError: MockInstance;

		let spyLedgerId: MockInstance;
		let spyGetTransactions: MockInstance;
		let spyMetadata: MockInstance;
		let spyBalance: MockInstance;

		const validParams = {
			identity: mockIdentity,
			icrcTokens: [],
			ledgerCanisterId: mockLedgerCanisterId
		};

		const tokenName = 'Test Token';
		const tokenSymbol = 'TEST';
		const tokenDecimals = 8;
		const tokenFee = 1000n;

		const existingToken: IcToken = {
			id: parseTokenId('test'),
			ledgerCanisterId: '2ouva-viaaa-aaaaq-aaamq-cai',
			indexCanisterId: '2awyi-oyaaa-aaaaq-aaanq-cai',
			standard: 'icp',
			category: 'custom',
			position: Number.MAX_VALUE,
			name: tokenName,
			symbol: tokenSymbol,
			decimals: tokenDecimals,
			fee: tokenFee,
			network: ICP_NETWORK
		};

		beforeEach(() => {
			vi.clearAllMocks();

			spyToastsError = vi.spyOn(toastsStore, 'toastsError');

			spyLedgerCreate = vi
				.spyOn(IcrcLedgerCanister, 'create')
				.mockImplementation(() => ledgerCanisterMock);
			spyIndexCreate = vi
				.spyOn(IcrcIndexNgCanister, 'create')
				.mockImplementation(() => indexCanisterMock);
		});

		describe('error', () => {
			it('should return error if identity is missing', async () => {
				await expect(() =>
					loadAndAssertAddCustomToken({
						identity: undefined,
						icrcTokens: [],
						ledgerCanisterId: mockLedgerCanisterId,
						indexCanisterId: mockIndexCanisterId
					})
				).rejects.toThrow();
			});

			it('should return error if ledgerCanisterId is missing', async () => {
				const result = await loadAndAssertAddCustomToken({
					identity: mockIdentity,
					icrcTokens: [],
					indexCanisterId: mockIndexCanisterId
				});

				expect(result).toEqual({ result: 'error' });

				expect(spyToastsError).toHaveBeenNthCalledWith(1, {
					msg: { text: get(i18n).tokens.import.error.missing_ledger_id }
				});
			});

			it('should return error if the ledger canister is the ICP token ledger', async () => {
				const result = await loadAndAssertAddCustomToken({
					identity: mockIdentity,
					icrcTokens: [],
					ledgerCanisterId: ICP_LEDGER_CANISTER_ID
				});

				expect(result).toEqual({ result: 'error' });

				expect(spyToastsError).toHaveBeenNthCalledWith(1, {
					msg: { text: get(i18n).tokens.error.already_available }
				});
			});

			it('should return error if token is already available', async () => {
				const result = await loadAndAssertAddCustomToken({
					identity: mockIdentity,
					icrcTokens: [
						{
							id: parseTokenId('test'),
							ledgerCanisterId: mockLedgerCanisterId,
							indexCanisterId: mockIndexCanisterId,
							standard: 'icp',
							category: 'custom',
							position: 0,
							name: 'Test',
							symbol: 'TEST',
							decimals: 8,
							fee: 1000n,
							network: ICP_NETWORK
						}
					],
					ledgerCanisterId: mockLedgerCanisterId,
					indexCanisterId: mockIndexCanisterId
				});

				expect(result).toEqual({ result: 'error' });

				expect(spyToastsError).toHaveBeenNthCalledWith(1, {
					msg: { text: get(i18n).tokens.error.already_available }
				});
			});

			describe('without index canister', () => {
				it('should return error if metadata are undefined', async () => {
					spyBalance = ledgerCanisterMock.balance.mockResolvedValue(123n);

					spyMetadata = ledgerCanisterMock.metadata.mockResolvedValue([]);

					const result = await loadAndAssertAddCustomToken(validParams);

					expect(result).toEqual({ result: 'error' });

					expect(spyToastsError).toHaveBeenNthCalledWith(1, {
						msg: { text: get(i18n).tokens.import.error.no_metadata }
					});
				});

				it('should return error if token already exits', async () => {
					spyBalance = ledgerCanisterMock.balance.mockResolvedValue(123n);

					spyMetadata = ledgerCanisterMock.metadata.mockResolvedValue([
						['icrc1:name', { Text: tokenName }],
						['icrc1:symbol', { Text: tokenSymbol }],
						['icrc1:decimals', { Nat: BigInt(tokenDecimals) }],
						['icrc1:fee', { Nat: tokenFee }]
					]);

					const result = await loadAndAssertAddCustomToken({
						...validParams,
						icrcTokens: [existingToken]
					});

					expect(result).toEqual({ result: 'error' });

					expect(spyToastsError).toHaveBeenNthCalledWith(1, {
						msg: { text: get(i18n).tokens.error.duplicate_metadata }
					});
				});
			});

			describe('with index canister', () => {
				it('should return error if ledger is not related to index', async () => {
					indexCanisterMock.ledgerId.mockResolvedValue(
						Principal.fromText('2ouva-viaaa-aaaaq-aaamq-cai')
					);

					const result = await loadAndAssertAddCustomToken({
						...validParams,
						indexCanisterId: mockIndexCanisterId
					});

					expect(result).toEqual({ result: 'error' });
				});

				it('should return error if metadata are undefined', async () => {
					spyLedgerId = indexCanisterMock.ledgerId.mockResolvedValue(
						Principal.fromText(mockLedgerCanisterId)
					);

					spyGetTransactions = indexCanisterMock.getTransactions.mockResolvedValue({
						balance: 100n,
						transactions: [],
						oldest_tx_id: [0n]
					});

					spyMetadata = ledgerCanisterMock.metadata.mockResolvedValue([]);

					const result = await loadAndAssertAddCustomToken({
						...validParams,
						indexCanisterId: mockIndexCanisterId
					});

					expect(result).toEqual({ result: 'error' });

					expect(spyToastsError).toHaveBeenNthCalledWith(1, {
						msg: { text: get(i18n).tokens.import.error.no_metadata }
					});
				});

				it('should return error if token already exits', async () => {
					spyLedgerId = indexCanisterMock.ledgerId.mockResolvedValue(
						Principal.fromText(mockLedgerCanisterId)
					);

					spyGetTransactions = indexCanisterMock.getTransactions.mockResolvedValue({
						balance: 100n,
						transactions: [],
						oldest_tx_id: [0n]
					});

					spyMetadata = ledgerCanisterMock.metadata.mockResolvedValue([
						['icrc1:name', { Text: tokenName }],
						['icrc1:symbol', { Text: tokenSymbol }],
						['icrc1:decimals', { Nat: BigInt(tokenDecimals) }],
						['icrc1:fee', { Nat: tokenFee }]
					]);

					const result = await loadAndAssertAddCustomToken({
						...validParams,
						indexCanisterId: mockIndexCanisterId,
						icrcTokens: [existingToken]
					});

					expect(result).toEqual({ result: 'error' });

					expect(spyToastsError).toHaveBeenNthCalledWith(1, {
						msg: { text: get(i18n).tokens.error.duplicate_metadata }
					});
				});
			});
		});

		describe('success', () => {
			beforeEach(() => {
				spyMetadata = ledgerCanisterMock.metadata.mockResolvedValue([
					['icrc1:name', { Text: tokenName }],
					['icrc1:symbol', { Text: tokenSymbol }],
					['icrc1:decimals', { Nat: BigInt(tokenDecimals) }],
					['icrc1:fee', { Nat: tokenFee }]
				]);
			});

			const expectedBalance = 100n;

			type LoadAndAssertAddCustomTokenParams = Partial<IcCanisters> & {
				identity: OptionIdentity;
				icrcTokens: IcToken[];
			};

			const assertUpdateCallMetadata = async (params: LoadAndAssertAddCustomTokenParams) => {
				await loadAndAssertAddCustomToken(params);

				expect(spyMetadata).toHaveBeenNthCalledWith(1, {
					certified: true
				});
			};

			const assertLoadToken = async (params: LoadAndAssertAddCustomTokenParams) => {
				const result = await loadAndAssertAddCustomToken(params);

				expect(result.result).toBe('success');
				expect(result.data).toBeDefined();
				expect(result.data?.balance).toBe(expectedBalance);
				expect(result.data?.token).toMatchObject({
					name: tokenName,
					symbol: tokenSymbol,
					decimals: tokenDecimals
				});
			};

			const assertLoadTokenDifferent = async (params: LoadAndAssertAddCustomTokenParams) => {
				const { result } = await loadAndAssertAddCustomToken({
					...params,
					icrcTokens: [
						{
							...existingToken,
							name: 'Another name',
							symbol: 'Another symbol'
						}
					]
				});

				expect(result).toBe('success');
			};

			it('should init ledger with expected canister id', async () => {
				await loadAndAssertAddCustomToken(validParams);

				expect(spyLedgerCreate).toHaveBeenNthCalledWith(
					1,
					expect.objectContaining({ canisterId: Principal.fromText(mockLedgerCanisterId) })
				);
			});

			describe('without index canister', () => {
				beforeEach(() => {
					spyBalance = ledgerCanisterMock.balance.mockResolvedValue(expectedBalance);
				});

				it('should accept loading without indexCanisterId', async () => {
					const { result } = await loadAndAssertAddCustomToken({
						identity: mockIdentity,
						icrcTokens: [],
						ledgerCanisterId: mockLedgerCanisterId
					});

					expect(result).toBe('success');
				});

				it('should call with an update balance to retrieve the current balance of the token', async () => {
					await loadAndAssertAddCustomToken(validParams);

					expect(spyBalance).toHaveBeenNthCalledWith(1, {
						certified: true,
						owner: mockPrincipal
					});
				});

				it('should call with an update metadata to retrieve the details of the token', async () => {
					await assertUpdateCallMetadata(validParams);
				});

				it('should successfully load a new token', async () => {
					await assertLoadToken(validParams);
				});

				it('should successfully load a new token if name and symbol is different', async () => {
					await assertLoadTokenDifferent(validParams);
				});
			});

			describe('with index canister', () => {
				const validParamsWithIndex = {
					...validParams,
					indexCanisterId: mockIndexCanisterId
				};

				beforeEach(() => {
					spyLedgerId = indexCanisterMock.ledgerId.mockResolvedValue(
						Principal.fromText(mockLedgerCanisterId)
					);

					spyGetTransactions = indexCanisterMock.getTransactions.mockResolvedValue({
						balance: expectedBalance,
						transactions: [],
						oldest_tx_id: [0n]
					});
				});

				it('should init index with expected canister id', async () => {
					await loadAndAssertAddCustomToken(validParamsWithIndex);

					expect(spyIndexCreate).toHaveBeenNthCalledWith(
						1,
						expect.objectContaining({ canisterId: Principal.fromText(mockIndexCanisterId) })
					);
				});

				it('should call with an update ledgerId to ensure Index and Ledger are related', async () => {
					await loadAndAssertAddCustomToken(validParamsWithIndex);

					expect(spyLedgerId).toHaveBeenNthCalledWith(1, {
						certified: true
					});
				});

				it('should call with an update getTransactions to retrieve the current balance of the token', async () => {
					await loadAndAssertAddCustomToken(validParamsWithIndex);

					expect(spyGetTransactions).toHaveBeenNthCalledWith(1, {
						account: getIcrcAccount(mockIdentity.getPrincipal()),
						certified: true,
						max_results: ZERO,
						start: undefined
					});
				});

				it('should call with an update metadata to retrieve the details of the token', async () => {
					await assertUpdateCallMetadata(validParamsWithIndex);
				});

				it('should successfully load a new token', async () => {
					await assertLoadToken(validParamsWithIndex);
				});

				it('should successfully load a new token if name and symbol is different', async () => {
					await assertLoadTokenDifferent(validParamsWithIndex);
				});
			});
		});
	});
});
