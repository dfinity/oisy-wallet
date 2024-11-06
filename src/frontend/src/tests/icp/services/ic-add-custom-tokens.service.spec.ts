import { ICP_NETWORK } from '$env/networks.env';
import { loadAndAssertAddCustomToken } from '$icp/services/ic-add-custom-tokens.service';
import { getIcrcAccount } from '$icp/utils/icrc-account.utils';
import * as agent from '$lib/actors/agents.ic';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { HttpAgent } from '@dfinity/agent';
import { IcrcIndexNgCanister, IcrcLedgerCanister } from '@dfinity/ledger-icrc';
import { Principal } from '@dfinity/principal';
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

		beforeEach(() => {
			vi.clearAllMocks();

			spyLedgerCreate = vi
				.spyOn(IcrcLedgerCanister, 'create')
				.mockImplementation(() => ledgerCanisterMock);
			spyIndexCreate = vi
				.spyOn(IcrcIndexNgCanister, 'create')
				.mockImplementation(() => indexCanisterMock);
			vi.spyOn(agent, 'getAgent').mockResolvedValue(mock<HttpAgent>());
		});

		describe('error', () => {
			it('should return error if ledgerCanisterId is missing', async () => {
				const result = await loadAndAssertAddCustomToken({
					identity: mockIdentity,
					icrcTokens: [],
					indexCanisterId: mockIndexCanisterId
				});

				expect(result).toEqual({ result: 'error' });
			});

			it('should return error if indexCanisterId is missing', async () => {
				const result = await loadAndAssertAddCustomToken({
					identity: mockIdentity,
					icrcTokens: [],
					ledgerCanisterId: mockLedgerCanisterId
				});

				expect(result).toEqual({ result: 'error' });
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
			});
		});

		describe('success', () => {
			let spyLedgerId: MockInstance;
			let spyGetTransactions: MockInstance;
			let spyMetadata: MockInstance;

			const validParams = {
				identity: mockIdentity,
				icrcTokens: [],
				ledgerCanisterId: mockLedgerCanisterId,
				indexCanisterId: mockIndexCanisterId
			};

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
					['icrc1:name', { Text: 'Test Token' }],
					['icrc1:symbol', { Text: 'TEST' }],
					['icrc1:decimals', { Nat: 8n }],
					['icrc1:fee', { Nat: 1000n }]
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

			it('should successfully add a new token', async () => {
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
		});
	});
});
