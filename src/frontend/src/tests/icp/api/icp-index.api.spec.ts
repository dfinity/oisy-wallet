import { ICP_INDEX_CANISTER_ID } from '$env/networks/networks.icp.env';
import { getAccountIdentifierTransactions, getTransactions } from '$icp/api/icp-index.api';
import { getAccountIdentifier } from '$icp/utils/icp-account.utils';
import { WALLET_PAGINATION, ZERO } from '$lib/constants/app.constants';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import { IcpIndexCanister, type IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';
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
});
