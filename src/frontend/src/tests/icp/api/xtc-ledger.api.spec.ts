import { balance, transactions, transfer } from '$icp/api/xtc-ledger.api';
import { XtcLedgerCanister } from '$icp/canisters/xtc-ledger.canister';
import type { Dip20TransactionWithId } from '$icp/types/api';
import { mockIdentity, mockPrincipal, mockPrincipal2 } from '$tests/mocks/identity.mock';
import type { IcrcAccount } from '@dfinity/ledger-icrc';
import { toNullable } from '@dfinity/utils';
import { mock } from 'vitest-mock-extended';

describe('xtc-ledger.api', () => {
	const ledgerCanisterMock = mock<XtcLedgerCanister>();

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(XtcLedgerCanister, 'create').mockResolvedValue(ledgerCanisterMock);
	});

	describe('transfer', () => {
		const params = {
			owner: mockPrincipal,
			identity: mockIdentity,
			to: mockPrincipal2,
			amount: 100_000n
		};

		const transactionId = 123n;

		const account: IcrcAccount = {
			owner: mockPrincipal
		};

		beforeEach(() => {
			ledgerCanisterMock.transfer.mockResolvedValue(transactionId);
		});

		it('successfully calls balance endpoint', async () => {
			const result = await transfer(params);

			expect(result).toEqual(transactionId);

			expect(ledgerCanisterMock.transfer).toHaveBeenCalledOnce();
			expect(ledgerCanisterMock.transfer).toHaveBeenCalledWith({
				to: params.to,
				amount: params.amount,
				...account
			});
		});

		it('throws an error if identity is undefined', async () => {
			await expect(transfer({ ...params, identity: undefined })).rejects.toThrow();
		});
	});

	describe('balance', () => {
		const params = {
			owner: mockPrincipal,
			identity: mockIdentity
		};

		const balanceE8s = 314_000_000n;

		beforeEach(() => {
			ledgerCanisterMock.balance.mockResolvedValue(balanceE8s);
		});

		it('successfully calls balance endpoint', async () => {
			const result = await balance(params);

			expect(result).toEqual(balanceE8s);

			expect(ledgerCanisterMock.balance).toHaveBeenCalledOnce();
			expect(ledgerCanisterMock.balance).toHaveBeenCalledWith(mockPrincipal);
		});

		it('throws an error if identity is undefined', async () => {
			await expect(balance({ ...params, identity: undefined })).rejects.toThrow();
		});
	});

	describe('transactions', () => {
		const params = {
			identity: mockIdentity,
			certified: true
		};

		const transactionsResponse: {
			transactions: Dip20TransactionWithId[];
			oldest_tx_id: [] | [bigint];
		} = {
			transactions: [
				{
					id: 1n,
					transaction: {
						kind: { Transfer: { to: mockPrincipal, from: mockPrincipal2 } },
						timestamp: 1n,
						fee: 456n,
						status: { SUCCEEDED: null },
						cycles: 1_000_000_000_000n
					}
				},
				{
					id: 2n,
					transaction: {
						kind: { Transfer: { to: mockPrincipal2, from: mockPrincipal } },
						timestamp: 2n,
						fee: 456n,
						status: { SUCCEEDED: null },
						cycles: 2_000_000_000_000n
					}
				}
			],
			oldest_tx_id: toNullable(123n)
		};

		beforeEach(() => {
			ledgerCanisterMock.transactions.mockResolvedValue(transactionsResponse);
		});

		it('successfully calls transactions endpoint', async () => {
			const result = await transactions(params);

			expect(result).toEqual(transactionsResponse);

			expect(ledgerCanisterMock.transactions).toHaveBeenCalledOnce();
			expect(ledgerCanisterMock.transactions).toHaveBeenCalledWith({ certified: true });
		});

		it('successfully calls transactions endpoint as query', async () => {
			const result = await transactions({
				...params,
				certified: false
			});

			expect(result).toEqual(transactionsResponse);

			expect(ledgerCanisterMock.transactions).toHaveBeenCalledOnce();
			expect(ledgerCanisterMock.transactions).toHaveBeenCalledWith({ certified: false });
		});

		it('throws an error if identity is undefined', async () => {
			await expect(transactions({ ...params, identity: undefined })).rejects.toThrow();
		});
	});
});
