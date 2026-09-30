import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import { ACTIVE_USER_TRANSACTION_ERROR_MAX_BYTES } from '$lib/constants/app.constants';
import { Languages } from '$lib/enums/languages';
import * as activeUserTransactionsServices from '$lib/services/active-user-transactions.services';
import { i18n } from '$lib/stores/i18n.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import {
	mockLiquidiumActiveUserTransaction,
	mockXrpActiveUserTransaction,
	mockXrpData,
	mockXrpLastLedgerSequence,
	mockXrpSwapActiveUserTransaction,
	mockXrpTxHash
} from '$tests/mocks/active-user-transactions.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { XRP_LEDGER_SEARCH_LOOKBACK } from '$xrp/constants/xrp.constants';
import * as xrplRest from '$xrp/rest/xrpl.rest';
import { pollXrpActiveUserTransactions } from '$xrp/services/xrp-active-tx.services';
import { XrpNetworks } from '$xrp/types/network';
import { XRP_EXTERNAL_REF_KEYS, XRP_LEDGER_RESULT_EXPIRED } from '$xrp/types/xrp-active-tx';
import { toXrpLedgerResolutionRefs } from '$xrp/utils/xrp-active-tx.utils';
import { DEFAULT_DEFINITIONS } from 'ripple-binary-codec';
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

			// The message names what was being sent, filled from the row's own display snapshot —
			// by the time the ledger decides there is nothing live left to ask.
			expectStatus({
				status: { Failed: null },
				error: replacePlaceholders(get(i18n).send.error.xrp_send_expired, {
					$amount: '25',
					$symbol: 'XRP',
					$network: 'XRP Ledger'
				})
			});
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

	// The failure text is the only thing the user sees, and it arrives possibly long after the
	// modal is gone — so it has to say what was being sent, from the row rather than from anything
	// live.
	describe('the failure message names the payment', () => {
		const errorOf = () => {
			const [{ update }] = applySpy.mock.calls[0] as [{ update: { error: string } }];

			return update.error;
		};

		it('names the amount, symbol and network on expiry', async () => {
			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({ state: 'absent' });
			vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(
				mockXrpLastLedgerSequence + 1
			);

			await poll();

			expect(errorOf()).toContain('25 XRP');
			expect(errorOf()).toContain('XRP Ledger');
		});

		it('names the payment and the result code on a validated failure', async () => {
			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({
				state: 'validated',
				transactionResult: 'tecUNFUNDED_PAYMENT'
			});

			await poll();

			expect(errorOf()).toContain('25 XRP');
			expect(errorOf()).toContain('XRP Ledger');
			expect(errorOf()).toContain('tecUNFUNDED_PAYMENT');
		});

		// The backend refuses an `error` over its byte limit — and with it the whole update, status
		// included — so a text that does not fit must not stand between a row and its verdict.
		describe('a failure text over the backend limit', () => {
			it('closes the row without text rather than leaving it open', async () => {
				vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({
					state: 'validated',
					// Matches the schema's `tec[A-Z0-9_]+`, but no real code is anywhere near this long.
					transactionResult: `tec${'X'.repeat(600)}`
				});

				await poll();

				expectStatus({ status: { Failed: null } });
			});

			it('closes an expired row without text when its snapshot is oversized', async () => {
				vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({ state: 'absent' });
				vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(
					mockXrpLastLedgerSequence + 1
				);

				// 256 is the backend's bound per ref value, so another client can store this.
				const oversized: ActiveUserTransaction = {
					...tx,
					external_refs: tx.external_refs.map((ref) =>
						[
							XRP_EXTERNAL_REF_KEYS.AMOUNT,
							XRP_EXTERNAL_REF_KEYS.TOKEN_SYMBOL,
							XRP_EXTERNAL_REF_KEYS.NETWORK_SYMBOL
						].includes(ref.key as never)
							? { ...ref, value: 'X'.repeat(256) }
							: ref
					)
				};

				await poll([oversized]);

				expect(applySpy).toHaveBeenCalledWith({
					identity,
					tx: oversized,
					update: { status: { Failed: null } }
				});
			});

			// What keeps the guard above for malformed input only: a real payment's text fits in every
			// shipped locale — the largest amount XRP's supply allows, at full precision, with the
			// longest result code the protocol defines. A translation that grows past the limit fails
			// here instead of silently degrading every such failure to generic copy.
			const longestResult = Object.keys(DEFAULT_DEFINITIONS.transactionResult)
				.filter((code) => /^tec[A-Z0-9_]+$/.test(code))
				.reduce((longest, code) => (code.length > longest.length ? code : longest));

			const bytes = (text: string) => new TextEncoder().encode(text).length;

			const subject = { $amount: '99999999999.999999', $symbol: 'XRP', $network: 'XRP Ledger' };

			it.each(Object.values(Languages))(
				"fits a real payment's failure texts in %s",
				async (language) => {
					const { send } = (await import(`$lib/i18n/${language}.json`)).default;

					expect(
						bytes(
							replacePlaceholders(send.error.xrp_active_transaction_failed, {
								...subject,
								$result: longestResult
							})
						)
					).toBeLessThanOrEqual(ACTIVE_USER_TRANSACTION_ERROR_MAX_BYTES);
					expect(
						bytes(replacePlaceholders(send.error.xrp_send_expired, subject))
					).toBeLessThanOrEqual(ACTIVE_USER_TRANSACTION_ERROR_MAX_BYTES);
				}
			);
		});

		// The backend requires only the two poll refs, so a row written by another client can lack
		// its display snapshot. The sentence must still be the specific one — not merely free of
		// placeholders, which "Your send of   on  was …" is too — built from what the backend does
		// guarantee: the amount in drops, at full precision, and a token that can only be native XRP.
		describe('without a display snapshot', () => {
			const withoutSnapshot: ActiveUserTransaction = {
				...tx,
				data: { Xrp: { ...mockXrpData, amount: 1_234_567n } },
				external_refs: tx.external_refs.filter(({ key }) =>
					[XRP_EXTERNAL_REF_KEYS.TX_HASH, XRP_EXTERNAL_REF_KEYS.LAST_LEDGER_SEQUENCE].includes(
						key as never
					)
				)
			};

			const subject = { $amount: '1.234567', $symbol: 'XRP', $network: 'XRP Ledger' };

			it('still names the payment on a validated failure', async () => {
				vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({
					state: 'validated',
					transactionResult: 'tecUNFUNDED_PAYMENT'
				});

				await poll([withoutSnapshot]);

				expect(errorOf()).toContain('1.234567 XRP on XRP Ledger');
				expect(errorOf()).toBe(
					replacePlaceholders(get(i18n).send.error.xrp_active_transaction_failed, {
						...subject,
						$result: 'tecUNFUNDED_PAYMENT'
					})
				);
			});

			it('still names the payment on expiry', async () => {
				vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({ state: 'absent' });
				vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(
					mockXrpLastLedgerSequence + 1
				);

				await poll([withoutSnapshot]);

				expect(errorOf()).toContain('1.234567 XRP on XRP Ledger');
				expect(errorOf()).toBe(replacePlaceholders(get(i18n).send.error.xrp_send_expired, subject));
			});
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

	// Nothing hands this poller a record to leave alone any more: the send stops at the submit and
	// never writes a terminal status, so there is one confirmation path rather than two racing for
	// an immutable write. That is why there is no ownership handshake to test here.
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

	// A swap's deposit is resolved like a send, but a validated deposit only pays 1Click: the row
	// goes on to `Executing`, where the NEAR Intents poller decides the swap's outcome.
	describe('a swap from XRP', () => {
		const swap = mockXrpSwapActiveUserTransaction;

		// The backend moves a swap from XRP out of `Pending` only with its deposit's result recorded,
		// so every resolution writes it, along with the refs the row already holds.
		const expectSwapStatus = ({
			status,
			error,
			ledgerResult
		}: {
			status: object;
			error?: string;
			ledgerResult: string;
		}) =>
			expect(applySpy).toHaveBeenCalledWith({
				identity,
				tx: swap,
				update: {
					status,
					...(error !== undefined ? { error } : {}),
					externalRefs: toXrpLedgerResolutionRefs({ tx: swap, ledgerResult })
				}
			});

		it('polls the deposit over the window the row was signed against', async () => {
			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({ state: 'pending' });

			await poll([swap]);

			expect(xrplRest.loadXrpTransactionOutcome).toHaveBeenCalledWith(expectedWindow);

			expectNoUpdate();
		});

		it('moves a validated tesSUCCESS deposit to Executing, not Succeeded', async () => {
			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({
				state: 'validated',
				transactionResult: 'tesSUCCESS'
			});

			await poll([swap]);

			expectSwapStatus({ status: { Executing: null }, ledgerResult: 'tesSUCCESS' });
		});

		it('moves a deposit the expiry recheck finds validated to Executing', async () => {
			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome')
				.mockResolvedValueOnce({ state: 'absent' })
				.mockResolvedValueOnce({ state: 'validated', transactionResult: 'tesSUCCESS' });
			vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(
				mockXrpLastLedgerSequence + 1
			);

			await poll([swap]);

			expectSwapStatus({ status: { Executing: null }, ledgerResult: 'tesSUCCESS' });
		});

		// A failed deposit sent nothing to 1Click, so the swap fails with the XRP send's message,
		// naming the deposit from the swap's own snapshot.
		it('fails the swap on a validated tec deposit, naming the deposit and the result', async () => {
			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({
				state: 'validated',
				transactionResult: 'tecNO_DST_INSUF_XRP'
			});

			await poll([swap]);

			expectSwapStatus({
				status: { Failed: null },
				error: replacePlaceholders(get(i18n).send.error.xrp_active_transaction_failed, {
					$amount: '10',
					$symbol: 'XRP',
					$network: 'XRP Ledger',
					$result: 'tecNO_DST_INSUF_XRP'
				}),
				ledgerResult: 'tecNO_DST_INSUF_XRP'
			});
		});

		it('fails the swap on an expired deposit, naming the deposit', async () => {
			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({ state: 'absent' });
			vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(
				mockXrpLastLedgerSequence + 1
			);

			await poll([swap]);

			expectSwapStatus({
				status: { Failed: null },
				error: replacePlaceholders(get(i18n).send.error.xrp_send_expired, {
					$amount: '10',
					$symbol: 'XRP',
					$network: 'XRP Ledger'
				}),
				ledgerResult: XRP_LEDGER_RESULT_EXPIRED
			});
		});

		it('keeps the row refs next to the ledger result, which a send never gets', async () => {
			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({
				state: 'validated',
				transactionResult: 'tesSUCCESS'
			});

			await poll([swap, tx]);

			const updates = (
				applySpy.mock.calls as [{ tx: ActiveUserTransaction; update: { externalRefs?: unknown } }][]
			).map(([{ tx: row, update }]) => ({ id: row.id, update }));
			const swapUpdate = updates.find(({ id }) => id === swap.id)?.update;
			const sendUpdate = updates.find(({ id }) => id === tx.id)?.update;

			expect(swapUpdate?.externalRefs).toEqual(
				expect.arrayContaining([
					...swap.external_refs,
					{ key: XRP_EXTERNAL_REF_KEYS.LEDGER_RESULT, value: 'tesSUCCESS' }
				])
			);
			expect(sendUpdate).not.toHaveProperty('externalRefs');
		});

		it('leaves a deposit absent within the window Pending', async () => {
			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({ state: 'absent' });

			await poll([swap]);

			expectNoUpdate();
		});
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
