import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import * as activeUserTransactionsServices from '$lib/services/active-user-transactions.services';
import { i18n } from '$lib/stores/i18n.store';
import {
	mockLiquidiumActiveUserTransaction,
	mockXrpActiveUserTransaction,
	mockXrpData,
	mockXrpLastLedgerSequence,
	mockXrpTxHash
} from '$tests/mocks/active-user-transactions.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { XRP_LEDGER_SEARCH_LOOKBACK } from '$xrp/constants/xrp.constants';
import * as xrplRest from '$xrp/rest/xrpl.rest';
import {
	claimXrpActiveUserTransaction,
	pollXrpActiveUserTransactions,
	releaseXrpActiveUserTransaction
} from '$xrp/services/xrp-active-tx.services';
import { XrpNetworks } from '$xrp/types/network';
import { XRP_EXTERNAL_REF_KEYS } from '$xrp/types/xrp-active-tx';
import { get } from 'svelte/store';

describe('xrp-active-tx.services', () => {
	const identity = mockIdentity;
	const tx = mockXrpActiveUserTransaction;

	// The window `deriveXrpLedgerWindow` gives the blob, reconstructed from the one
	// value the row stores. A resolver searching any other range would make the
	// node's `searched_all` answer a claim about the wrong ledgers.
	const expectedWindow = {
		hash: mockXrpTxHash,
		network: XrpNetworks.mainnet,
		firstLedgerSequence: mockXrpLastLedgerSequence - XRP_LEDGER_SEARCH_LOOKBACK,
		lastLedgerSequence: mockXrpLastLedgerSequence
	};

	let applySpy: ReturnType<typeof vi.spyOn>;

	const poll = async (transactions: ActiveUserTransaction[] = [tx]) =>
		await pollXrpActiveUserTransactions({ identity, transactions });

	const expectNoUpdate = () => expect(applySpy).not.toHaveBeenCalled();

	const expectStatus = ({ status, error }: { status: object; error?: string }) =>
		expect(applySpy).toHaveBeenCalledWith({
			identity,
			tx,
			update: { status, ...(error !== undefined ? { error } : {}) }
		});

	beforeEach(() => {
		vi.clearAllMocks();
		releaseXrpActiveUserTransaction(tx.id);

		vi.stubGlobal('fetch', () => Promise.reject(new Error('unexpected network call in a test')));

		applySpy = vi
			.spyOn(activeUserTransactionsServices, 'applyActiveUserTransactionPollUpdate')
			.mockResolvedValue();
		vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(mockXrpLastLedgerSequence);
	});

	it('does nothing with no transactions', async () => {
		const outcome = vi.spyOn(xrplRest, 'loadXrpTransactionOutcome');

		await poll([]);

		expect(outcome).not.toHaveBeenCalled();

		expectNoUpdate();
	});

	it('polls the hash over the window the row was signed against', async () => {
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({ state: 'pending' });

		await poll();

		expect(xrplRest.loadXrpTransactionOutcome).toHaveBeenCalledWith(expectedWindow);
	});

	describe('the mapping table', () => {
		it('resolves a validated tesSUCCESS as Succeeded', async () => {
			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({
				state: 'validated',
				transactionResult: 'tesSUCCESS'
			});

			await poll();

			expectStatus({ status: { Succeeded: null } });
		});

		// A `tec*` is validated too: applied, failed, fee claimed, sequence
		// consumed. The result code goes into the row so the user learns which one.
		it('resolves a validated tec result as Failed, naming the result', async () => {
			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({
				state: 'validated',
				transactionResult: 'tecUNFUNDED_PAYMENT'
			});

			await poll();

			expect(applySpy).toHaveBeenCalledOnce();

			const [{ update }] = applySpy.mock.calls[0] as [{ update: { error: string } }];

			expect(update).toMatchObject({ status: { Failed: null } });
			expect(update.error).toContain('tecUNFUNDED_PAYMENT');
		});

		// Absent past its `LastLedgerSequence`: it can never be applied, so the
		// sequence was never consumed and the next send legitimately reads the same
		// one from the node.
		it('resolves absence past the last ledger sequence as Failed, expired', async () => {
			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({ state: 'absent' });
			vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(
				mockXrpLastLedgerSequence + 1
			);

			await poll();

			expectStatus({ status: { Failed: null }, error: get(i18n).send.error.xrp_send_expired });
		});

		it('leaves absence within the window Pending', async () => {
			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({ state: 'absent' });
			vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(
				mockXrpLastLedgerSequence
			);

			await poll();

			expectNoUpdate();
		});

		// The node positively holding the transaction is the opposite of
		// non-inclusion. Nothing here supports closing the record.
		it('leaves a pending lookup Pending', async () => {
			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({ state: 'pending' });

			await poll();

			expectNoUpdate();
		});
	});

	// Everything a node can do wrong has to leave the record open. The cost of
	// wrongly closing it is a user told a resend is safe while the original
	// payment can still apply — the whole reason the record exists.
	describe('nothing else may close a record', () => {
		it('leaves an unanswerable lookup Pending', async () => {
			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockRejectedValue(new Error('tooBusy'));

			await poll();

			expectNoUpdate();
		});

		// `loadXrpTransactionOutcome` throws on a response that matches none of its
		// three variants, and on one answering for a different hash. Both arrive
		// here as a rejection, and both must be inert.
		it.each(['malformed response', 'answered for another hash'])(
			'leaves a %s Pending',
			async (message) => {
				vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockRejectedValue(new Error(message));

				await poll();

				expectNoUpdate();
			}
		);

		// The ledger read is what turns absence into expiry. Without it there is no
		// evidence the transaction can never apply.
		it('leaves absence Pending when the validated ledger index is unavailable', async () => {
			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({ state: 'absent' });
			vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockRejectedValue(new Error('tooBusy'));

			await poll();

			expectNoUpdate();
		});

		it('leaves a row with no usable poll keys Pending, without asking the node', async () => {
			const outcome = vi.spyOn(xrplRest, 'loadXrpTransactionOutcome');

			await poll([{ ...tx, external_refs: [] }]);

			expect(outcome).not.toHaveBeenCalled();

			expectNoUpdate();
		});

		it('leaves a row whose token is not XRP Pending, without asking the node', async () => {
			const outcome = vi.spyOn(xrplRest, 'loadXrpTransactionOutcome');

			await poll([
				{
					...tx,
					data: { Xrp: { ...mockXrpData, token: { IcpNative: null } } }
				} as ActiveUserTransaction
			]);

			expect(outcome).not.toHaveBeenCalled();

			expectNoUpdate();
		});
	});

	// The lookup and the ledger read are separate calls and can reach different
	// members of a load-balanced endpoint, so the lookup may have missed a payment
	// that validated in between. A terminal status is immutable on the backend, so
	// getting this wrong cannot be walked back.
	describe('the expiry recheck', () => {
		it('reports Succeeded when the recheck finds the payment validated after all', async () => {
			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome')
				.mockResolvedValueOnce({ state: 'absent' })
				.mockResolvedValueOnce({ state: 'validated', transactionResult: 'tesSUCCESS' });
			vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(
				mockXrpLastLedgerSequence + 1
			);

			await poll();

			expect(xrplRest.loadXrpTransactionOutcome).toHaveBeenCalledTimes(2);

			expectStatus({ status: { Succeeded: null } });
		});

		// A node handing the transaction back, unvalidated, past its expiry is
		// reporting that it exists. That is indeterminate, not dead.
		it('leaves the record Pending when the recheck reports it as pending', async () => {
			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome')
				.mockResolvedValueOnce({ state: 'absent' })
				.mockResolvedValueOnce({ state: 'pending' });
			vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(
				mockXrpLastLedgerSequence + 1
			);

			await poll();

			expectNoUpdate();
		});

		it('leaves the record Pending when the recheck cannot be answered', async () => {
			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome')
				.mockResolvedValueOnce({ state: 'absent' })
				.mockRejectedValueOnce(new Error('tooBusy'));
			vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(
				mockXrpLastLedgerSequence + 1
			);

			await poll();

			expectNoUpdate();
		});
	});

	// The send modal drives its own record while it is open, and the modal's
	// confirmation loop polls the identical hash. Both establish expiry the same
	// strict way, so this is not what makes either correct — it keeps the record's
	// transitions written by the code that owns the send while it still owns it.
	describe('ownership by a live send', () => {
		it('skips a record a live send in this tab is driving', async () => {
			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({
				state: 'validated',
				transactionResult: 'tesSUCCESS'
			});
			claimXrpActiveUserTransaction(tx.id);

			await poll();

			expect(xrplRest.loadXrpTransactionOutcome).not.toHaveBeenCalled();

			expectNoUpdate();
		});

		// A record whose creating session died is not claimed by anything, which is
		// exactly why the poller resolves it.
		it('resolves the record once the send releases it', async () => {
			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({
				state: 'validated',
				transactionResult: 'tesSUCCESS'
			});
			claimXrpActiveUserTransaction(tx.id);
			releaseXrpActiveUserTransaction(tx.id);

			await poll();

			expectStatus({ status: { Succeeded: null } });
		});
	});

	// Status transitions are forward-only, and terminal states are immutable. A
	// row already terminal must not be written again.
	it('does not write a status that is not a forward transition', async () => {
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({
			state: 'validated',
			transactionResult: 'tesSUCCESS'
		});

		await poll([{ ...tx, status: { Failed: null } }]);

		expectNoUpdate();
	});

	it('polls every record it is given', async () => {
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({ state: 'pending' });

		const second: ActiveUserTransaction = { ...tx, id: 'second' };

		await poll([tx, second]);

		expect(xrplRest.loadXrpTransactionOutcome).toHaveBeenCalledTimes(2);
	});

	it('ignores a record from another flow that is handed to it', async () => {
		const outcome = vi.spyOn(xrplRest, 'loadXrpTransactionOutcome');

		await poll([mockLiquidiumActiveUserTransaction]);

		expect(outcome).not.toHaveBeenCalled();

		expectNoUpdate();
	});

	it('reads the hash from the row rather than assuming one', async () => {
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({ state: 'pending' });

		await poll([
			{
				...tx,
				external_refs: [
					{ key: XRP_EXTERNAL_REF_KEYS.TX_HASH, value: 'CD'.repeat(32) },
					{ key: XRP_EXTERNAL_REF_KEYS.LAST_LEDGER_SEQUENCE, value: '2040' }
				]
			}
		]);

		expect(xrplRest.loadXrpTransactionOutcome).toHaveBeenCalledWith({
			hash: 'CD'.repeat(32),
			network: XrpNetworks.mainnet,
			firstLedgerSequence: 2040 - XRP_LEDGER_SEARCH_LOOKBACK,
			lastLedgerSequence: 2040
		});
	});
});
