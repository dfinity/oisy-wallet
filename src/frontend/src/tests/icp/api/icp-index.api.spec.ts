import { ICP_INDEX_CANISTER_ID } from '$env/networks/networks.icp.env';
import {
	getAccountIdentifierTransactions,
	getIcpIndexNumBlocksSynced,
	getTransactions
} from '$icp/api/icp-index.api';
import { IcpIndexStatusCanister } from '$icp/canisters/icp-index-status.canister';
import { getAccountIdentifier } from '$icp/utils/icp-account.utils';
import { WALLET_PAGINATION, ZERO } from '$lib/constants/app.constants';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import { IcpIndexCanister, type IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';
import { Principal } from '@icp-sdk/core/principal';
import { mock } from 'vitest-mock-extended';

describe('icp-index.api', () => {
	const indexCanisterMock = mock<IcpIndexCanister>();

	const response: IcpIndexDid.GetAccountIdentifierTransactionsResponse = {
		balance: ZERO,
		transactions: [],
		oldest_tx_id: []
	};

	const accountIdentifier = 'a1b2c3';

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(IcpIndexCanister, 'create').mockImplementation(() => indexCanisterMock);
		indexCanisterMock.getTransactions.mockResolvedValue(response);
	});

	describe('getAccountIdentifierTransactions', () => {
		it('reads the given account’s history, certified by default', async () => {
			await expect(
				getAccountIdentifierTransactions({
					identity: mockIdentity,
					accountIdentifier,
					indexCanisterId: ICP_INDEX_CANISTER_ID
				})
			).resolves.toBe(response);

			expect(indexCanisterMock.getTransactions).toHaveBeenCalledExactlyOnceWith({
				certified: true,
				start: undefined,
				maxResults: WALLET_PAGINATION,
				accountIdentifier
			});
		});

		it('passes the cursor, the page size and a query', async () => {
			await getAccountIdentifierTransactions({
				identity: mockIdentity,
				accountIdentifier,
				indexCanisterId: ICP_INDEX_CANISTER_ID,
				start: 42n,
				maxResults: 7n,
				certified: false
			});

			expect(indexCanisterMock.getTransactions).toHaveBeenCalledExactlyOnceWith({
				certified: false,
				start: 42n,
				maxResults: 7n,
				accountIdentifier
			});
		});

		it('throws without an identity, before calling the index', async () => {
			await expect(
				getAccountIdentifierTransactions({
					identity: undefined,
					accountIdentifier,
					indexCanisterId: ICP_INDEX_CANISTER_ID
				})
			).rejects.toThrow();

			expect(indexCanisterMock.getTransactions).not.toHaveBeenCalled();
		});
	});

	describe('getTransactions', () => {
		it('reads the owner’s default account', async () => {
			await expect(
				getTransactions({
					identity: mockIdentity,
					owner: mockPrincipal,
					indexCanisterId: ICP_INDEX_CANISTER_ID
				})
			).resolves.toBe(response);

			expect(indexCanisterMock.getTransactions).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					accountIdentifier: getAccountIdentifier(mockPrincipal).toHex()
				})
			);
		});
	});

	describe('getIcpIndexNumBlocksSynced', () => {
		const statusCanisterMock = mock<IcpIndexStatusCanister>();

		beforeEach(() => {
			vi.spyOn(IcpIndexStatusCanister, 'create').mockResolvedValue(statusCanisterMock);
			statusCanisterMock.numBlocksSynced.mockResolvedValue(123n);
		});

		it('reads how far the index has synced, certified by default', async () => {
			await expect(
				getIcpIndexNumBlocksSynced({
					identity: mockIdentity,
					indexCanisterId: ICP_INDEX_CANISTER_ID
				})
			).resolves.toBe(123n);

			expect(IcpIndexStatusCanister.create).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				canisterId: Principal.fromText(ICP_INDEX_CANISTER_ID)
			});
			expect(statusCanisterMock.numBlocksSynced).toHaveBeenCalledExactlyOnceWith({
				certified: true
			});
		});

		it('passes a query', async () => {
			await getIcpIndexNumBlocksSynced({
				identity: mockIdentity,
				indexCanisterId: ICP_INDEX_CANISTER_ID,
				certified: false
			});

			expect(statusCanisterMock.numBlocksSynced).toHaveBeenCalledExactlyOnceWith({
				certified: false
			});
		});

		it('throws without an identity, before calling the index', async () => {
			await expect(
				getIcpIndexNumBlocksSynced({
					identity: undefined,
					indexCanisterId: ICP_INDEX_CANISTER_ID
				})
			).rejects.toThrow();

			expect(statusCanisterMock.numBlocksSynced).not.toHaveBeenCalled();
		});
	});
});
