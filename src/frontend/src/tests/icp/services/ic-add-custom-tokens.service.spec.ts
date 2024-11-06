import { ICP_NETWORK } from '$env/networks.env';
import { loadAndAssertAddCustomToken } from '$icp/services/ic-add-custom-tokens.service';
import type { IcToken } from '$icp/types/ic-token';
import { getIcrcAccount } from '$icp/utils/icrc-account.utils';
import * as agent from '$lib/actors/agents.ic';
import { i18n } from '$lib/stores/i18n.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { HttpAgent } from '@dfinity/agent';
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

		const validParams = {
			identity: mockIdentity,
			icrcTokens: [],
			ledgerCanisterId: mockLedgerCanisterId,
			indexCanisterId: mockIndexCanisterId
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
			vi.spyOn(agent, 'getAgent').mockResolvedValue(mock<HttpAgent>());
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

			it('should return error if indexCanisterId is missing', async () => {
				const result = await loadAndAssertAddCustomToken({
					identity: mockIdentity,
					icrcTokens: [],
					ledgerCanisterId: mockLedgerCanisterId
				});

				expect(result).toEqual({ result: 'error' });

				expect(spyToastsError).toHaveBeenNthCalledWith(1, {
					msg: { text: get(i18n).tokens.import.error.missing_index_id }
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

			it('should return error if ledger is not related to index', async () => {
				indexCanisterMock.ledgerId.mockResolvedValue(
					Principal.fromText('2ouva-viaaa-aaaaq-aaamq-cai')
				);

				const result = await loadAndAssertAddCustomToken(validParams);

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

				const result = await loadAndAssertAddCustomToken(validParams);

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
					icrcTokens: [existingToken]
				});

				expect(result).toEqual({ result: 'error' });

				expect(spyToastsError).toHaveBeenNthCalledWith(1, {
					msg: { text: get(i18n).tokens.error.duplicate_metadata }
				});
			});
		});

		describe('success', () => {
			beforeEach(() => {
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
			});

			it('should init ledger with expected canister id', async () => {
				await loadAndAssertAddCustomToken(validParams);

				expect(spyLedgerCreate).toHaveBeenNthCalledWith(
					1,
					expect.objectContaining({ canisterId: Principal.fromText(mockLedgerCanisterId) })
				);
			});

			it('should init index with expected canister id', async () => {
				await loadAndAssertAddCustomToken(validParams);

				expect(spyIndexCreate).toHaveBeenNthCalledWith(
					1,
					expect.objectContaining({ canisterId: Principal.fromText(mockIndexCanisterId) })
				);
			});

			it('should call with an update ledgerId to ensure Index and Ledger are related', async () => {
				await loadAndAssertAddCustomToken(validParams);

				expect(spyLedgerId).toHaveBeenNthCalledWith(1, {
					certified: true
				});
			});

			it('should call with an update getTransactions to retrieve the current balance of the token', async () => {
				await loadAndAssertAddCustomToken(validParams);

				expect(spyGetTransactions).toHaveBeenNthCalledWith(1, {
					account: getIcrcAccount(mockIdentity.getPrincipal()),
					certified: true,
					max_results: 0n,
					start: undefined
				});
			});

			it('should call with an update metadata to retrieve the details of the token', async () => {
				await loadAndAssertAddCustomToken(validParams);

				expect(spyMetadata).toHaveBeenNthCalledWith(1, {
					certified: true
				});
			});

			it('should successfully load a new token', async () => {
				const result = await loadAndAssertAddCustomToken(validParams);

				expect(result.result).toBe('success');
				expect(result.data).toBeDefined();
				expect(result.data?.balance).toBe(100n);
				expect(result.data?.token).toMatchObject({
					name: 'Test Token',
					symbol: 'TEST',
					decimals: 8
				});
			});

			it('should successfully load a new token if name and symbol is different', async () => {
				const { result } = await loadAndAssertAddCustomToken({
					...validParams,
					icrcTokens: [
						{
							...existingToken,
							name: 'Another name',
							symbol: 'Another symbol'
						}
					]
				});

				expect(result).toBe('success');
			});
		});
	});
});
