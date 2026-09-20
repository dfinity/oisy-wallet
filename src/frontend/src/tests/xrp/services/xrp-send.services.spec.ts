import { ZERO } from '$lib/constants/app.constants';
import { ProgressStepsSendXrp } from '$lib/enums/progress-steps';
import { randomWait } from '$lib/utils/time.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';
import {
	XRP_BASE_RESERVE_DROPS,
	XRP_CONFIRM_MAX_ATTEMPTS,
	XRP_CONFIRM_MAX_DURATION_MS,
	XRP_CONFIRM_MAX_LEDGER_LOOKAHEAD,
	XRP_CONFIRM_MAX_POLL_MS,
	XRP_CONFIRM_MIN_POLL_MS,
	XRP_LAST_LEDGER_SEQUENCE_OFFSET,
	XRP_LEDGER_SEARCH_LOOKBACK,
	XRP_MAX_DESTINATION_TAG,
	XRP_MAX_FEE_DROPS,
	XRP_MAX_UINT32
} from '$xrp/constants/xrp.constants';
import { XrpRpcNotConfiguredError } from '$xrp/providers/xrp-rpc.providers';
import * as xrplRest from '$xrp/rest/xrpl.rest';
import { XrpAccountNotFoundError } from '$xrp/rest/xrpl.rest';
import { retryXrpSend, sendXrp } from '$xrp/services/xrp-send.services';
import * as xrpSignServices from '$xrp/services/xrp-sign.services';
import { XrpNetworks } from '$xrp/types/network';
import {
	XrpSendExpiredError,
	XrpSendIndeterminateError,
	XrpTransactionFailedError
} from '$xrp/types/xrp-send';
import type { XrpAccountInfo } from '$xrp/types/xrp-transaction';
import { deriveXrpTransactionHash } from '$xrp/utils/xrp-transaction.utils';
import { isNullish } from '@dfinity/utils';

vi.mock('$lib/utils/time.utils', () => ({
	randomWait: vi.fn()
}));

describe('xrp-send.services', () => {
	const source = 'rLUEXYuLiQptky37CqLcm9USQpPiz5rkpD';
	const destination = 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe';
	const signingPublicKey = 'ED01FA53FA5A7E77798F882ECE20B1ABC00BB358A9E55A202D0D0676BD0CE37A63';
	// A real encoded Payment, not a placeholder: both the transaction id and the ledger window
	// confirmation polls are derived from these bytes, so a blob that does not really carry
	// `LastLedgerSequence: 1020` would be asserting a window nothing signed. Sequence 7,
	// LastLedgerSequence 1020 — the window [1000, 1020] every expectation below uses.
	const signedBlob =
		'1200002400000007201B000003FC61400000000098968068400000000000000C7321ED01FA53FA5A7E77798F882ECE20B1ABC00BB358A9E55A202D0D0676BD0CE37A638114D28B177E48D9A8D057E70F7E464B498367281B988314F667B0CA50CC7709A220B0561B85E53A48461FA8';

	const params = {
		identity: mockIdentity,
		network: XrpNetworks.mainnet,
		source,
		destination,
		amount: 25_000_000n,
		fee: 12n,
		destinationTag: 12345
	};

	beforeEach(() => {
		vi.clearAllMocks();
		// `clearAllMocks` keeps implementations, and a test that makes `randomWait` advance fake
		// timers would otherwise do so in every test after it.
		vi.mocked(randomWait).mockReset();

		// Every RPC this path makes is mocked below. The env resolves `XRP_RPC_HTTP_URL_MAINNET` to
		// `undefined` under vitest, so a missing mock already fails on the endpoint assertion; this
		// stub is the second line, and catches anything that acquires an endpoint of its own.
		vi.stubGlobal('fetch', () => Promise.reject(new Error('unexpected network call in a test')));

		vi.spyOn(xrplRest, 'loadXrpAccountInfo').mockResolvedValue({
			balance: 50_000_000n,
			sequence: 7,
			ownerCount: 0,
			flags: 0
		});
		// The destination is read before signing to refuse a payment too small to create an unfunded
		// account. Funded by default, so only the tests that care set it to ZERO.
		vi.spyOn(xrplRest, 'loadXrpBalance').mockResolvedValue(30_000_000n);
		vi.spyOn(xrplRest, 'loadXrpOpenLedgerFee').mockResolvedValue(12n);
		vi.spyOn(xrplRest, 'loadXrpLedgerIndex').mockResolvedValue(1000);
		vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(1000);
		vi.spyOn(xrpSignServices, 'getXrpSigningPublicKey').mockResolvedValue(signingPublicKey);
		vi.spyOn(xrpSignServices, 'signXrpTransaction').mockResolvedValue(signedBlob);
		vi.spyOn(xrplRest, 'submitXrpTransaction').mockResolvedValue({
			engineResult: 'tesSUCCESS',
			accepted: true,
			txHash: 'TXHASH'
		});
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({
			state: 'validated',
			transactionResult: 'tesSUCCESS'
		});
	});

	it('builds the payment from fetched sequence/fee/ledger and threshold-signs it', async () => {
		await sendXrp(params);

		expect(xrpSignServices.signXrpTransaction).toHaveBeenCalledWith({
			identity: mockIdentity,
			network: XrpNetworks.mainnet,
			transaction: {
				TransactionType: 'Payment',
				Account: source,
				Destination: destination,
				Amount: '25000000',
				Fee: '12',
				Sequence: 7,
				SigningPubKey: signingPublicKey,
				DestinationTag: 12345,
				LastLedgerSequence: 1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET
			}
		});
	});

	// The check that the signing key belongs to its account lives in `getXrpSigningPublicKey`, so
	// it is only worth the account handed to it. Asking with anything but the address the payment
	// says it is from would check the key against the wrong account and pass a send that XRPL then
	// rejects on a signature that cannot verify.
	it('asks for a signing key bound to the account it sends from', async () => {
		await sendXrp(params);

		expect(xrpSignServices.getXrpSigningPublicKey).toHaveBeenCalledWith({
			identity: mockIdentity,
			network: XrpNetworks.mainnet,
			account: source
		});
	});

	it('submits the signed blob and returns the accepted result', async () => {
		const result = await sendXrp(params);

		expect(xrplRest.submitXrpTransaction).toHaveBeenCalledWith({
			txBlob: signedBlob,
			network: XrpNetworks.mainnet
		});
		expect(result.submitResult?.engineResult).toBe('tesSUCCESS');
	});

	// The hash must not come from the submit response: if that response is lost there would be
	// nothing to poll, the send would be reported failed, and a retry would pay twice.
	it('derives the transaction id from the blob rather than the response', async () => {
		const { txHash } = await sendXrp(params);

		expect(txHash).not.toBe('TXHASH');
		expect(txHash).toMatch(/^[0-9A-F]{64}$/);
	});

	it('derives the same id for the same blob', async () => {
		const first = await sendXrp(params);
		const second = await sendXrp(params);

		expect(second.txHash).toBe(first.txHash);
	});

	it('reports progress through the send steps', async () => {
		const progress = vi.fn();

		await sendXrp({ ...params, progress });

		expect(progress.mock.calls.map(([step]) => step)).toEqual([
			ProgressStepsSendXrp.INITIALIZATION,
			ProgressStepsSendXrp.SIGN,
			ProgressStepsSendXrp.SEND,
			ProgressStepsSendXrp.CONFIRM,
			ProgressStepsSendXrp.DONE
		]);
	});

	// Past the broadcast a progress observer must not be able to change what happened to the blob.
	// Unguarded, a throw at CONFIRM escaped as a plain error with no `pending` attached — which a
	// caller cannot tell from a pre-broadcast failure, so it rebuilds on a new sequence and pays
	// twice — and a throw at DONE reported a validated `tesSUCCESS` as a rejection, where a resend
	// is unambiguously a duplicate.
	describe('a progress observer that throws', () => {
		const throwingAt = (step: ProgressStepsSendXrp) =>
			vi.fn((reported: ProgressStepsSendXrp) => {
				if (reported === step) {
					throw new Error(`observer failed at ${reported}`);
				}
			});

		it.each([ProgressStepsSendXrp.CONFIRM, ProgressStepsSendXrp.DONE])(
			'cannot change the outcome when it throws at %s',
			async (step) => {
				const progress = throwingAt(step);

				await expect(sendXrp({ ...params, progress })).resolves.toBeDefined();
			}
		);

		// Both post-broadcast steps are still reported, so one observer failing does not silence
		// the other.
		it('still reports DONE when the observer threw at CONFIRM', async () => {
			const progress = throwingAt(ProgressStepsSendXrp.CONFIRM);

			await sendXrp({ ...params, progress });

			expect(progress.mock.calls.map(([reported]) => reported)).toContain(
				ProgressStepsSendXrp.DONE
			);
		});

		// The other half of the contract. Before the broadcast there is nothing on the wire, so an
		// observer throwing must still abort — wrapping those calls would swallow a real caller
		// failure at the one moment it is free to fail.
		//
		// `SEND` matters most of the three: it is emitted immediately before `submitXrpTransaction`,
		// so it is the pre-broadcast step a refactor would most plausibly move to the wrong side of
		// the line, and the only one whose neighbour on the other side is already swallowed.
		it.each([
			ProgressStepsSendXrp.INITIALIZATION,
			ProgressStepsSendXrp.SIGN,
			ProgressStepsSendXrp.SEND
		])('still aborts the send when it throws at %s', async (step) => {
			const progress = throwingAt(step);

			await expect(sendXrp({ ...params, progress })).rejects.toThrow('observer failed');

			expect(xrplRest.submitXrpTransaction).not.toHaveBeenCalled();
		});
	});

	it('waits for the transaction to be validated', async () => {
		const { txHash } = await sendXrp(params);

		expect(xrplRest.loadXrpTransactionOutcome).toHaveBeenCalledWith({
			hash: txHash,
			network: XrpNetworks.mainnet,
			// The SEARCH bound, which is deliberately not the signing offset: only
			// `LastLedgerSequence` is in the blob, so the lower bound is reconstructed and must not
			// move when the signing offset does.
			firstLedgerSequence: 1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET - XRP_LEDGER_SEARCH_LOOKBACK,
			lastLedgerSequence: 1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET
		});
	});

	// A transport or shape failure says nothing about whether the node applied the blob.
	it('still confirms when the submit response is lost', async () => {
		vi.spyOn(xrplRest, 'submitXrpTransaction').mockRejectedValue(new Error('network down'));

		const { txHash, submitResult } = await sendXrp(params);

		expect(submitResult).toBeUndefined();
		expect(xrplRest.loadXrpTransactionOutcome).toHaveBeenCalledWith({
			hash: txHash,
			network: XrpNetworks.mainnet,
			// The SEARCH bound, which is deliberately not the signing offset: only
			// `LastLedgerSequence` is in the blob, so the lower bound is reconstructed and must not
			// move when the signing offset does.
			firstLedgerSequence: 1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET - XRP_LEDGER_SEARCH_LOOKBACK,
			lastLedgerSequence: 1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET
		});
	});

	// A shape failure is indistinguishable from a lost response: the node may have taken the blob
	// either way, so it must reach confirmation rather than being reported as a rejection.
	it('still confirms when the submit response is malformed', async () => {
		vi.spyOn(xrplRest, 'submitXrpTransaction').mockRejectedValue(
			new Error('Unexpected XRPL submit response: no string engine_result')
		);

		const { txHash, submitResult } = await sendXrp(params);

		expect(submitResult).toBeUndefined();
		expect(xrplRest.loadXrpTransactionOutcome).toHaveBeenCalledWith({
			hash: txHash,
			network: XrpNetworks.mainnet,
			// The SEARCH bound, which is deliberately not the signing offset: only
			// `LastLedgerSequence` is in the blob, so the lower bound is reconstructed and must not
			// move when the signing offset does.
			firstLedgerSequence: 1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET - XRP_LEDGER_SEARCH_LOOKBACK,
			lastLedgerSequence: 1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET
		});
	});

	it('reports expiry rather than failure when a lost submit never appears', async () => {
		vi.spyOn(xrplRest, 'submitXrpTransaction').mockRejectedValue(new Error('network down'));
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({ state: 'absent' });
		vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(
			1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET + 1
		);

		await expect(sendXrp(params)).rejects.toThrow('XRP transaction expired');
	});

	// A response we understood is authoritative, so it must not be polled around.
	it('fails immediately on a deterministic engine rejection', async () => {
		// The response echoes the hash of the blob it was given, as a node does — the rejection
		// branch is definitive only for a response that names this transaction.
		vi.spyOn(xrplRest, 'submitXrpTransaction').mockImplementation(async ({ txBlob }) => ({
			engineResult: 'temBAD_FEE',
			accepted: false,
			txHash: await deriveXrpTransactionHash(txBlob)
		}));

		await expect(sendXrp(params)).rejects.toThrow('XRP transaction rejected');
		expect(xrplRest.loadXrpTransactionOutcome).not.toHaveBeenCalled();
	});

	// `accepted: false` says this node did not take the blob; it does not say no ledger will include
	// it. So the result still comes from confirmation, and a `tec` reported there is a real failure.
	it('confirms a tec result the node did not accept rather than rejecting it', async () => {
		vi.spyOn(xrplRest, 'submitXrpTransaction').mockResolvedValue({
			engineResult: 'tecUNFUNDED_PAYMENT',
			accepted: false
		});
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({
			state: 'validated',
			transactionResult: 'tecUNFUNDED_PAYMENT'
		});

		await expect(sendXrp(params)).rejects.toThrow('XRP transaction failed: tecUNFUNDED_PAYMENT');

		expect(xrplRest.loadXrpTransactionOutcome).toHaveBeenCalled();
	});

	// A `tec` at submit means the node APPLIED the transaction, so it must reach confirmation:
	// failing here would call an applied transaction rejected and never report which `tec` it was
	// or that the fee was charged.
	it('confirms an accepted tec result instead of calling it rejected', async () => {
		vi.spyOn(xrplRest, 'submitXrpTransaction').mockResolvedValue({
			engineResult: 'tecUNFUNDED_PAYMENT',
			accepted: true,
			txHash: 'TXHASH'
		});
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({
			state: 'validated',
			transactionResult: 'tecUNFUNDED_PAYMENT'
		});

		await expect(sendXrp(params)).rejects.toThrow('XRP transaction failed: tecUNFUNDED_PAYMENT');

		expect(xrplRest.loadXrpTransactionOutcome).toHaveBeenCalled();
	});

	// Both results a resubmitted send can get: `tefPAST_SEQ` once the original landed and consumed
	// the sequence, `tefALREADY` for a duplicate inside the same open ledger. Either must reach
	// confirmation — rejecting here would report a completed payment as unsent and invite a retry
	// that pays a second time.
	it.each(['tefPAST_SEQ', 'tefALREADY'])(
		'confirms %s instead of reporting the payment unsent',
		async (engineResult) => {
			vi.spyOn(xrplRest, 'submitXrpTransaction').mockImplementation(async ({ txBlob }) => ({
				engineResult,
				accepted: false,
				txHash: await deriveXrpTransactionHash(txBlob)
			}));

			await expect(sendXrp(params)).resolves.toBeDefined();

			expect(xrplRest.loadXrpTransactionOutcome).toHaveBeenCalled();
		}
	);

	// `tef` may be reapplied and `tel` may be cached and retried, so neither is proof the payment
	// will not happen. Reporting them as failed would invite a retry that pays twice; they are
	// polled to expiry instead, which is definitive and safe to send again after.
	it.each(['tefPAST_SEQ', 'tefMAX_LEDGER', 'telINSUF_FEE_P'])(
		'polls %s to expiry rather than reporting it rejected',
		async (engineResult) => {
			vi.spyOn(xrplRest, 'submitXrpTransaction').mockImplementation(async ({ txBlob }) => ({
				engineResult,
				accepted: false,
				txHash: await deriveXrpTransactionHash(txBlob)
			}));
			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({ state: 'absent' });
			vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(
				1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET + 1
			);

			await expect(sendXrp(params)).rejects.toThrow('XRP transaction expired');

			expect(xrplRest.loadXrpTransactionOutcome).toHaveBeenCalled();
		}
	);

	// Malformed is the only class the XRPL reference calls final, so it is the only one reported as
	// failed without asking the ledger.
	it.each(['temBAD_FEE', 'temBAD_AMOUNT'])(
		'fails immediately on %s without confirming',
		async (engineResult) => {
			vi.spyOn(xrplRest, 'submitXrpTransaction').mockImplementation(async ({ txBlob }) => ({
				engineResult,
				accepted: false,
				txHash: await deriveXrpTransactionHash(txBlob)
			}));

			await expect(sendXrp(params)).rejects.toThrow('XRP transaction rejected');

			expect(xrplRest.loadXrpTransactionOutcome).not.toHaveBeenCalled();
		}
	);

	// The submit response is the last answer on this path that was acted on without being tied to
	// the blob it answered. A `tem*` naming a different transaction — or naming none — is not
	// evidence about THIS one, and the rejection it would produce is the report that tells a caller
	// to rebuild on a new sequence, which is a second payment.
	it.each([
		{ name: 'names another transaction', txHash: 'B'.repeat(64) },
		{ name: 'names no transaction', txHash: undefined }
	])('confirms a temBAD_FEE whose response $name', async ({ txHash }) => {
		vi.spyOn(xrplRest, 'submitXrpTransaction').mockResolvedValue({
			engineResult: 'temBAD_FEE',
			accepted: false,
			txHash
		});

		await expect(sendXrp(params)).resolves.toBeDefined();

		expect(xrplRest.loadXrpTransactionOutcome).toHaveBeenCalled();
	});

	// Unless the same response also claims the node took the blob. Nothing can be both malformed
	// and accepted — no node applies a `tem` — so the response contradicts itself, and this is the
	// one place that declares a definitive failure after the blob is already broadcast. It polls
	// instead, which costs a validity window on a transaction that will never land and avoids
	// reporting a contradictory answer as this payment's rejection.
	it.each(['temBAD_FEE', 'temBAD_AMOUNT'])(
		'confirms %s when the node claims to have accepted it',
		async (engineResult) => {
			vi.spyOn(xrplRest, 'submitXrpTransaction').mockResolvedValue({
				engineResult,
				accepted: true
			});

			await expect(sendXrp(params)).resolves.toBeDefined();

			expect(xrplRest.loadXrpTransactionOutcome).toHaveBeenCalled();
		}
	);

	// The end of the same argument, one layer down: a malformed `accepted` used to collapse to
	// `false`, which made a `tem*` a definitive rejection on the strength of a field the response
	// never actually stated. It now fails the submit parse, and a submit that throws is already
	// treated as a lost response — so the hash decides instead of the malformed flag.
	it('confirms rather than rejecting when the submit response has a malformed accepted flag', async () => {
		vi.spyOn(xrplRest, 'submitXrpTransaction').mockRejectedValue(
			new Error('Unexpected XRPL submit response: it does not match the expected shape')
		);

		const { submitResult } = await sendXrp(params);

		expect(submitResult).toBeUndefined();
		expect(xrplRest.loadXrpTransactionOutcome).toHaveBeenCalled();
	});

	// Both this and the indeterminate error are thrown at the CONFIRM step, so the type is the only
	// thing a caller can use to tell a settled failure — fee charged, funds not sent — from an
	// outcome nobody knows yet. Getting that backwards tells the user to keep waiting for a balance
	// that will never move.
	it('types a validated failure distinctly from an indeterminate one', async () => {
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({
			state: 'validated',
			transactionResult: 'tecUNFUNDED_PAYMENT'
		});

		const err = await sendXrp(params).catch((e: unknown) => e);

		expect(err).toBeInstanceOf(XrpTransactionFailedError);
		expect(err).not.toBeInstanceOf(XrpSendIndeterminateError);
		expect(err).not.toBeInstanceOf(XrpSendExpiredError);
	});

	// A validated transaction is only final; `tec*` results are validated too.
	it('throws when the transaction is validated with a failing result', async () => {
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({
			state: 'validated',
			transactionResult: 'tecUNFUNDED_PAYMENT'
		});

		await expect(sendXrp(params)).rejects.toThrow('XRP transaction failed: tecUNFUNDED_PAYMENT');
	});

	// The failure is terminal, so it must surface at once instead of being retried.
	it('does not retry a validated failure', async () => {
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({
			state: 'validated',
			transactionResult: 'tecUNFUNDED_PAYMENT'
		});

		await expect(sendXrp(params)).rejects.toThrow('XRP transaction failed');

		expect(xrplRest.loadXrpTransactionOutcome).toHaveBeenCalledOnce();
	});

	// The transaction stays valid until its LastLedgerSequence, so confirmation must keep
	// polling rather than give up on a fixed budget and report a false failure — which would
	// invite the user to send a duplicate. The count deliberately exceeds the ten retries the
	// previous implementation allowed.
	// The attempt cap is derived from the ~80s validity window (20 ledgers at ~4s) so that it
	// cannot fire before the ledger has had its chance: reaching it is the one exit that ends a
	// send with an unknown outcome. Validating at the far end of that window must therefore still
	// succeed — at the fastest 1s polling, 80 attempts span it.
	it('keeps polling for the whole ledger validity window', async () => {
		const validatesOnAttempt = XRP_LAST_LEDGER_SEQUENCE_OFFSET * 4;
		let attempts = 0;

		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockImplementation(() => {
			attempts++;

			return Promise.resolve(
				attempts < validatesOnAttempt
					? { state: 'absent' }
					: { state: 'validated', transactionResult: 'tesSUCCESS' }
			);
		});

		await expect(sendXrp(params)).resolves.toBeDefined();

		expect(attempts).toBe(validatesOnAttempt);
	});

	// Only once the ledger has passed the LastLedgerSequence is non-inclusion final.
	it('fails once the transaction can no longer be included', async () => {
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({ state: 'absent' });
		// The payment is built at 1000 (LastLedgerSequence 1020); expiry is only final once the
		// VALIDATED index passes it.
		vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(
			1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET + 1
		);

		await expect(sendXrp(params)).rejects.toThrow('XRP transaction expired');
	});

	// The `tx` lookup and the validated index come from two separate calls, so the lookup can miss
	// a payment that validates in between. Expiry must survive a recheck.
	it('returns the result when the recheck finds the payment validated after expiry', async () => {
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome')
			.mockResolvedValueOnce({ state: 'absent' })
			.mockResolvedValue({ state: 'validated', transactionResult: 'tesSUCCESS' });

		vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(
			1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET + 1
		);

		await expect(sendXrp(params)).resolves.toBeDefined();
	});

	it('still expires when the recheck does not find the payment', async () => {
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({ state: 'absent' });

		vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(
			1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET + 1
		);

		await expect(sendXrp(params)).rejects.toThrow('XRP transaction expired');
	});

	// The whole point of the recheck is to avoid inviting a duplicate payment. A node that cannot
	// answer it has not established non-inclusion, so the error must surface instead of becoming a
	// claim that the payment never applied — that claim is what tells the user a resend is safe.
	it('does not declare expiry when the recheck cannot be answered', async () => {
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome')
			.mockResolvedValueOnce({ state: 'absent' })
			.mockRejectedValue(new Error('Unexpected XRPL tx response: tooBusy'));

		vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(
			1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET + 1
		);

		const err = await sendXrp(params).catch((e: unknown) => e);

		// Exactly two lookups: the poll, then the recheck inside the expiry branch. Any other count
		// means the branch this test exists for was never entered — the earlier version of this test
		// called `sendXrp` twice, and on the second call every lookup rejected, so it exited through
		// the attempt cap and asserted only that the cap's message lacks the word "expired".
		expect(xrplRest.loadXrpTransactionOutcome).toHaveBeenCalledTimes(2);
		expect(xrplRest.loadXrpValidatedLedgerIndex).toHaveBeenCalledOnce();

		// The type is the assertion: an unanswered recheck leaves non-inclusion unestablished, so it
		// must be indeterminate and must NOT be the expiry that tells the caller a resend is safe.
		expect(err).toBeInstanceOf(XrpSendIndeterminateError);
		expect(err).not.toBeInstanceOf(XrpSendExpiredError);
		expect((err as Error).message).toContain('tooBusy');
	});

	// A lookup the node could not answer establishes nothing, so it must cost an attempt rather
	// than abort a confirmation that still has budget left.
	it('keeps polling after a lookup the node could not answer', async () => {
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome')
			.mockRejectedValueOnce(new Error('Unexpected XRPL tx response: tooBusy'))
			.mockResolvedValue({ state: 'validated', transactionResult: 'tesSUCCESS' });

		vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(1000);

		await expect(sendXrp(params)).resolves.toBeDefined();
	});

	// The blob may already be accepted by the time this runs, so aborting on a failed ledger call
	// would report a payment that can still validate as failed.
	it('keeps polling after a validated-ledger call the node could not answer', async () => {
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome')
			.mockResolvedValueOnce({ state: 'absent' })
			.mockResolvedValue({ state: 'validated', transactionResult: 'tesSUCCESS' });

		vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex')
			.mockRejectedValueOnce(new Error('XRPL ledger request failed with status 503'))
			.mockResolvedValue(1000);

		await expect(sendXrp(params)).resolves.toBeDefined();
	});

	// The bound is on how far the ledger appears to MOVE while one run watches, measured from the
	// first index that run read. The first read is accepted as given — nothing in the run can
	// corroborate it — so a high one still reaches the expiry conclusion, which is what a genuinely
	// expired send needs.
	it.each([
		{ name: 'just past the transaction window', index: 1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET + 1 },
		{
			name: 'far past it, as a delayed retry sees',
			index: 1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET + XRP_CONFIRM_MAX_LEDGER_LOOKAHEAD * 10
		}
	])('declares expiry from a first index $name', async ({ index }) => {
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({ state: 'absent' });
		vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(index);

		await expect(sendXrp(params)).rejects.toBeInstanceOf(XrpSendExpiredError);
	});

	// What the bound does catch: an index that jumps further mid-run than the ledger could have
	// travelled. The first read is one close short of expiry, so no conclusion is available yet;
	// the second is implausible and is discarded like a read the node refused, leaving the run
	// indeterminate rather than concluding expiry from a number that cannot be right.
	it('does not declare expiry from an implausible mid-run jump', async () => {
		const lastLedgerSequence = 1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET;

		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({ state: 'absent' });
		vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex')
			.mockResolvedValueOnce(lastLedgerSequence - 1)
			.mockResolvedValue(lastLedgerSequence - 1 + XRP_CONFIRM_MAX_LEDGER_LOOKAHEAD + 1);

		const err = await sendXrp(params).catch((e: unknown) => e);

		expect(err).toBeInstanceOf(XrpSendIndeterminateError);
		expect(err).not.toBeInstanceOf(XrpSendExpiredError);
		expect((err as XrpSendIndeterminateError).pending).toEqual({ txBlob: signedBlob });
	});

	// The other side of that: a jump exactly at the bound is still movement the ledger could have
	// made, so it is a real answer and expiry follows.
	it('declares expiry from a mid-run move that is exactly at the bound', async () => {
		const lastLedgerSequence = 1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET;

		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({ state: 'absent' });
		vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex')
			.mockResolvedValueOnce(lastLedgerSequence - 1)
			.mockResolvedValue(lastLedgerSequence - 1 + XRP_CONFIRM_MAX_LEDGER_LOOKAHEAD);

		await expect(sendXrp(params)).rejects.toBeInstanceOf(XrpSendExpiredError);
	});

	// An unanswered ledger call establishes nothing, so it must not skip the expiry it would have
	// established either: the run ends in the indeterminate error, not in a claim of failure.
	it('ends indeterminate when the validated-ledger call is never answered', async () => {
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({ state: 'absent' });
		vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockRejectedValue(
			new Error('XRPL ledger request failed with status 503')
		);

		// The message names which of the two limits ended it, so an operator can tell "the ledger
		// never decided" from "the node was too slow to let it".
		await expect(sendXrp(params)).rejects.toThrow(
			`stopped before its ledger expiry was reached: ${XRP_CONFIRM_MAX_ATTEMPTS} attempts made`
		);
	});

	// The attempt count is not a time bound: each attempt costs an interval plus however long its
	// requests take, so a node answering slowly stretches 160 attempts far past the window they
	// were derived from, and the user waits on CONFIRM with no answer of any kind.
	it('gives up on the deadline when the attempts would take too long', async () => {
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({ state: 'absent' });
		vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(1000);

		vi.useFakeTimers();

		// Each poll now costs a tenth of the whole budget, so the deadline is reached long before
		// the attempts are.
		vi.mocked(randomWait).mockImplementation(() => {
			vi.advanceTimersByTime(XRP_CONFIRM_MAX_DURATION_MS / 10);

			return Promise.resolve();
		});

		const err = await sendXrp(params).catch((e: unknown) => e);

		vi.useRealTimers();

		expect((err as Error).message).toContain(`${XRP_CONFIRM_MAX_DURATION_MS}ms elapsed`);
		// Ten polls span the budget, against a cap of 160.
		expect(xrplRest.loadXrpTransactionOutcome).toHaveBeenCalledTimes(10);
		expect(XRP_CONFIRM_MAX_ATTEMPTS).toBe(160);
	});

	// The loop condition reads the deadline only BETWEEN iterations, so an iteration entered just
	// under it could still start a ledger read, an expiry recheck and a poll — each request bounded
	// by its own timeout — and overshoot the documented budget by three of them.
	describe('the deadline bounds the work inside an iteration, not only between them', () => {
		// Spends the whole budget inside the first `tx` lookup, the way a node answering at its
		// timeout does.
		const spendBudgetOnTheLookup = () =>
			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockImplementation(() => {
				vi.advanceTimersByTime(XRP_CONFIRM_MAX_DURATION_MS);

				return Promise.resolve({ state: 'absent' });
			});

		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('starts no validated-ledger read once the budget is spent', async () => {
			spendBudgetOnTheLookup();

			await expect(sendXrp(params)).rejects.toThrow(`${XRP_CONFIRM_MAX_DURATION_MS}ms elapsed`);

			expect(xrplRest.loadXrpValidatedLedgerIndex).not.toHaveBeenCalled();
		});

		it('takes no poll interval once the budget is spent', async () => {
			spendBudgetOnTheLookup();

			await sendXrp(params).catch(() => undefined);

			expect(randomWait).not.toHaveBeenCalled();
		});

		// The recheck is what keeps a stale lookup from becoming a false expiry, so a budget spent
		// before it must skip the conclusion too: indeterminate, which hands the blob back, rather
		// than asserting that a payment which may have landed never did.
		it('concludes no expiry when the budget runs out before the recheck', async () => {
			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({ state: 'absent' });
			vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockImplementation(() => {
				vi.advanceTimersByTime(XRP_CONFIRM_MAX_DURATION_MS);

				return Promise.resolve(1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET + 1);
			});

			const err = await sendXrp(params).catch((e: unknown) => e);

			expect(err).not.toBeInstanceOf(XrpSendExpiredError);
			expect((err as Error).message).toContain(`${XRP_CONFIRM_MAX_DURATION_MS}ms elapsed`);
			// The first lookup only — the recheck is the second call, and it was never started.
			expect(xrplRest.loadXrpTransactionOutcome).toHaveBeenCalledOnce();
		});

		// A definitive answer already in hand is still returned: the budget bounds new work, not
		// the result of work already done.
		it('still returns a validated result found on the last allowed lookup', async () => {
			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockImplementation(() => {
				vi.advanceTimersByTime(XRP_CONFIRM_MAX_DURATION_MS);

				return Promise.resolve({ state: 'validated', transactionResult: 'tesSUCCESS' });
			});

			await expect(sendXrp(params)).resolves.toBeDefined();
		});
	});

	// A validated failure found by the recheck must surface as a failure, not as an expiry.
	it('reports a tec failure found by the recheck', async () => {
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome')
			.mockResolvedValueOnce({ state: 'absent' })
			.mockResolvedValue({ state: 'validated', transactionResult: 'tecUNFUNDED_PAYMENT' });

		vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(
			1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET + 1
		);

		await expect(sendXrp(params)).rejects.toThrow('XRP transaction failed');
	});

	// The open ledger runs ahead of validation, so comparing against it would report a final
	// failure for a payment that is still about to validate — and invite a duplicate send.
	it('does not report expiry while only the open ledger has passed LastLedgerSequence', async () => {
		// The payment is absent for two lookups and then validates. An implementation comparing
		// against the open index would reach the expiry branch on the first lookup, find the hash
		// still absent on its recheck, and throw — so the third lookup must be what decides.
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome')
			.mockResolvedValueOnce({ state: 'absent' })
			.mockResolvedValueOnce({ state: 'absent' })
			.mockResolvedValue({ state: 'validated', transactionResult: 'tesSUCCESS' });

		// The signing-time call sets LastLedgerSequence to 1020; any LATER read of the open index
		// answers 1025, which is past it. The validated index — the only correct basis — is 1000.
		vi.spyOn(xrplRest, 'loadXrpLedgerIndex')
			.mockResolvedValueOnce(1000)
			.mockResolvedValue(1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET + 5);
		vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(1000);

		await expect(sendXrp(params)).resolves.toBeDefined();
	});

	// A validated record can only carry `tes` or `tec`, so one claiming anything else is malformed.
	// The caller turns every non-`tesSUCCESS` result into a definitive `XrpTransactionFailedError`,
	// so the schema rejecting it is what keeps a malformed response from becoming a confident "your
	// payment failed": the outcome read throws, the poll treats it as unanswered, and the run ends
	// indeterminate with the blob handed back.
	it.each(['tefPAST_SEQ', 'anything'])(
		'does not report a validated %s as a transaction failure',
		async (transactionResult) => {
			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockRejectedValue(
				new Error(
					`Unexpected XRPL tx response: neither a validated result, a pending transaction, nor a fully searched absence (${transactionResult})`
				)
			);

			const err = await sendXrp(params).catch((e: unknown) => e);

			expect(err).not.toBeInstanceOf(XrpTransactionFailedError);
			expect(err).toBeInstanceOf(XrpSendIndeterminateError);
		}
	);

	describe('retrying an indeterminate send', () => {
		// `retryXrpSend` enters with a stored blob and makes NO earlier call, so the submit is its
		// first request — and the first place a missing endpoint can surface. Swallowed as
		// ambiguous, it would spend the whole confirmation budget polling the same unreachable
		// endpoint and report an indeterminate outcome for a blob that was definitely never sent.
		describe('an endpoint that is not configured', () => {
			const notConfigured = new XrpRpcNotConfiguredError('No XRPL RPC endpoint is configured');

			it('surfaces as itself on the retry path rather than as an indeterminate send', async () => {
				vi.spyOn(xrplRest, 'submitXrpTransaction').mockRejectedValue(notConfigured);

				const err = await retryXrpSend({
					network: XrpNetworks.mainnet,
					pending: { txBlob: signedBlob }
				}).catch((e: unknown) => e);

				expect(err).toBe(notConfigured);
				expect(err).not.toBeInstanceOf(XrpSendIndeterminateError);
				expect(xrplRest.loadXrpTransactionOutcome).not.toHaveBeenCalled();
			});

			// The other side of the same catch: a failure that FOLLOWS a request may have been
			// processed, so it still falls through to confirmation.
			it('still confirms after a transport failure', async () => {
				vi.spyOn(xrplRest, 'submitXrpTransaction').mockRejectedValue(new Error('network down'));

				await expect(
					retryXrpSend({ network: XrpNetworks.mainnet, pending: { txBlob: signedBlob } })
				).resolves.toBeDefined();

				expect(xrplRest.loadXrpTransactionOutcome).toHaveBeenCalled();
			});
		});

		// The whole point: a retry must be able to resubmit THIS transaction. If the outcome is
		// unknown and the error does not carry it, the only possible retry builds a new transaction
		// from a fresh sequence — a second, independent payment.
		it('hands back the signed transaction when the outcome is never established', async () => {
			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({ state: 'absent' });
			vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(1000);

			const err = await sendXrp(params).catch((e: unknown) => e);

			expect(err).toBeInstanceOf(XrpSendIndeterminateError);
			// The blob and nothing else. The transaction id and the ledger window a retry polls are
			// both pure functions of it, and carrying either let a retry act on one transaction while
			// describing another.
			expect((err as XrpSendIndeterminateError).pending).toEqual({ txBlob: signedBlob });
		});

		// Expiry is the opposite case: the transaction can never apply, so a retry MUST build a new
		// one and carrying this one would be wrong.
		it('reports expiry as its own error, with nothing to resubmit', async () => {
			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({ state: 'absent' });
			vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(
				1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET + 1
			);

			const err = await sendXrp(params).catch((e: unknown) => e);

			expect(err).toBeInstanceOf(XrpSendExpiredError);
			expect(err).not.toBeInstanceOf(XrpSendIndeterminateError);
		});

		// The recheck and the ledger read are two separate calls, so on a load-balanced endpoint one
		// member can report an index past expiry while another still holds the transaction
		// unvalidated. A node handing the transaction back is the opposite of absence, so this must
		// not become expiry — which would tell a retry to build a new transaction on a fresh
		// sequence, and pay twice if the original did land.
		it('does not declare expiry when the recheck still finds the transaction pending', async () => {
			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({ state: 'pending' });
			vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(
				1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET + 1
			);

			const err = await sendXrp(params).catch((e: unknown) => e);

			expect(err).toBeInstanceOf(XrpSendIndeterminateError);
			expect(err).not.toBeInstanceOf(XrpSendExpiredError);
			expect((err as XrpSendIndeterminateError).pending).toEqual({ txBlob: signedBlob });
		});

		// The signature is the guarantee. A retry takes no identity, addresses, amount or fee, so a
		// caller cannot review one payment and resubmit another — and none of the fresh-send work
		// can run on this path even by accident.
		it('reads nothing and signs nothing', async () => {
			const pending = {
				txBlob:
					'1200002400000008201B000010E061400000000098968068400000000000000C7321ED01FA53FA5A7E77798F882ECE20B1ABC00BB358A9E55A202D0D0676BD0CE37A638114D28B177E48D9A8D057E70F7E464B498367281B988314F667B0CA50CC7709A220B0561B85E53A48461FA8'
			};

			await retryXrpSend({ network: XrpNetworks.mainnet, pending });

			expect(xrplRest.loadXrpAccountInfo).not.toHaveBeenCalled();
			expect(xrplRest.loadXrpLedgerIndex).not.toHaveBeenCalled();
			expect(xrplRest.loadXrpOpenLedgerFee).not.toHaveBeenCalled();
			expect(xrpSignServices.getXrpSigningPublicKey).not.toHaveBeenCalled();
			expect(xrpSignServices.signXrpTransaction).not.toHaveBeenCalled();
		});

		it('resubmits the stored transaction instead of building a new one', async () => {
			const pending = {
				// Sequence 8, LastLedgerSequence 4320 — window [4300, 4320], derived, not declared.
				txBlob:
					'1200002400000008201B000010E061400000000098968068400000000000000C7321ED01FA53FA5A7E77798F882ECE20B1ABC00BB358A9E55A202D0D0676BD0CE37A638114D28B177E48D9A8D057E70F7E464B498367281B988314F667B0CA50CC7709A220B0561B85E53A48461FA8'
			};
			// The id that blob derives to — the only one a retry may poll.
			const blobHash = await deriveXrpTransactionHash(pending.txBlob);

			await retryXrpSend({ network: XrpNetworks.mainnet, pending });

			expect(xrplRest.submitXrpTransaction).toHaveBeenCalledExactlyOnceWith({
				txBlob: pending.txBlob,
				network: XrpNetworks.mainnet
			});
			// Literal, not read back off `pending`: the window has to come out of the blob, and
			// comparing it against a field of the same object would pass whatever was handed in.
			expect(xrplRest.loadXrpTransactionOutcome).toHaveBeenCalledWith({
				hash: blobHash,
				network: XrpNetworks.mainnet,
				firstLedgerSequence: 4320 - XRP_LEDGER_SEARCH_LOOKBACK,
				lastLedgerSequence: 4320
			});

			// Nothing is fetched, rebuilt or re-signed: a new sequence would make this a different
			// transaction, which is the duplicate payment this exists to prevent.
			expect(xrplRest.loadXrpAccountInfo).not.toHaveBeenCalled();
			expect(xrplRest.loadXrpLedgerIndex).not.toHaveBeenCalled();
			expect(xrpSignServices.signXrpTransaction).not.toHaveBeenCalled();
		});

		// The id polled on a retry must be the blob's own. When it travelled as a separate field, a
		// mismatch meant submitting one transaction and concluding a different one had expired —
		// which reports a settled payment as safe to resend. The fixture that caught this carried
		// `'A'.repeat(64)` for a blob deriving to BF3F06…4590, and every test still passed.
		it('polls the id its blob derives to, not one it was handed', async () => {
			const pending = {
				// Sequence 8, LastLedgerSequence 4320 — window [4300, 4320], derived, not declared.
				txBlob:
					'1200002400000008201B000010E061400000000098968068400000000000000C7321ED01FA53FA5A7E77798F882ECE20B1ABC00BB358A9E55A202D0D0676BD0CE37A638114D28B177E48D9A8D057E70F7E464B498367281B988314F667B0CA50CC7709A220B0561B85E53A48461FA8'
			};

			await retryXrpSend({ network: XrpNetworks.mainnet, pending });

			expect(xrplRest.loadXrpTransactionOutcome).toHaveBeenCalledWith(
				expect.objectContaining({
					hash: 'DF525DC5393BD6A354BDABD7DB411D3381D01C04C74BFA3CD22F0F2E64ADC81E'
				})
			);
		});

		// Refused before anything is broadcast. Without a signed expiry the transaction can never
		// expire, so confirmation could never reach a definitive answer about it and no retry for it
		// could be called safe — and broadcasting first would put an unbounded payment on the wire.
		it('refuses a stored blob with no signed expiry, without broadcasting it', async () => {
			const pending = {
				// The same Payment as above with `LastLedgerSequence` left out.
				txBlob:
					'120000240000000861400000000098968068400000000000000C7321ED01FA53FA5A7E77798F882ECE20B1ABC00BB358A9E55A202D0D0676BD0CE37A638114D28B177E48D9A8D057E70F7E464B498367281B988314F667B0CA50CC7709A220B0561B85E53A48461FA8'
			};

			await expect(retryXrpSend({ network: XrpNetworks.mainnet, pending })).rejects.toThrow(
				'carries no LastLedgerSequence'
			);

			expect(xrplRest.submitXrpTransaction).not.toHaveBeenCalled();
			expect(xrplRest.loadXrpTransactionOutcome).not.toHaveBeenCalled();
		});

		// The payoff: the first attempt did land, so its sequence is consumed and the resubmission is
		// refused with `tefPAST_SEQ` rather than applied again. The poll then reports the original
		// transaction's real outcome.
		it('reports the original outcome when the resubmitted transaction already applied', async () => {
			const pending = {
				// Sequence 8, LastLedgerSequence 4320 — window [4300, 4320], derived, not declared.
				txBlob:
					'1200002400000008201B000010E061400000000098968068400000000000000C7321ED01FA53FA5A7E77798F882ECE20B1ABC00BB358A9E55A202D0D0676BD0CE37A638114D28B177E48D9A8D057E70F7E464B498367281B988314F667B0CA50CC7709A220B0561B85E53A48461FA8'
			};
			// The id that blob derives to — the only one a retry may poll.
			const blobHash = await deriveXrpTransactionHash(pending.txBlob);

			vi.spyOn(xrplRest, 'submitXrpTransaction').mockResolvedValue({
				engineResult: 'tefPAST_SEQ',
				accepted: false
			});

			await expect(retryXrpSend({ network: XrpNetworks.mainnet, pending })).resolves.toEqual({
				txHash: blobHash,
				submitResult: { engineResult: 'tefPAST_SEQ', accepted: false }
			});
		});
	});

	describe("the sender's own reserve", () => {
		// XRPL applies a payment that would leave the account below its reserve as
		// `tecUNFUNDED_PAYMENT`: fee destroyed, sequence burned, nothing delivered. The balance and
		// `OwnerCount` needed to refuse it are already in hand from the account load.
		const sourceWith = ({ balance, ownerCount }: { balance: bigint; ownerCount: number }) =>
			vi
				.spyOn(xrplRest, 'loadXrpAccountInfo')
				.mockResolvedValue({ balance, sequence: 7, ownerCount, flags: 0 });

		it('refuses an amount that would leave the account below its reserve', async () => {
			// 2 XRP held, 2 ledger objects: reserve 1_000_000 + 2 x 200_000 = 1_400_000, so with a
			// 10-drop fee only 599_990 is sendable.
			sourceWith({ balance: 2_000_000n, ownerCount: 2 });

			await expect(sendXrp({ ...params, amount: 900_000n, fee: 10n })).rejects.toThrow(
				'exceeds the sendable maximum'
			);

			expect(xrpSignServices.signXrpTransaction).not.toHaveBeenCalled();
			expect(xrplRest.submitXrpTransaction).not.toHaveBeenCalled();
		});

		it('sends exactly the sendable maximum', async () => {
			sourceWith({ balance: 2_000_000n, ownerCount: 2 });

			await expect(sendXrp({ ...params, amount: 599_990n, fee: 10n })).resolves.toBeDefined();
		});

		// The owner reserve is what makes this account-specific: the same balance and amount are
		// sendable with no ledger objects and not sendable with two.
		it('scales the reserve with OwnerCount', async () => {
			sourceWith({ balance: 2_000_000n, ownerCount: 0 });

			await expect(sendXrp({ ...params, amount: 900_000n, fee: 10n })).resolves.toBeDefined();
		});

		// The fee is part of what must fit, not an afterthought.
		it('counts the fee against the sendable maximum', async () => {
			sourceWith({ balance: 2_000_000n, ownerCount: 0 });

			await expect(sendXrp({ ...params, amount: 1_000_000n, fee: 1n })).rejects.toThrow(
				'exceeds the sendable maximum'
			);
		});
	});

	// The three guards that need account state cannot run before the reads, so the key fetch has to
	// come after THEM — not merely after the argument checks. `Promise.all` rejects on the first
	// rejection, so a key failure sharing that call would win a race against whichever of these
	// diagnoses the user can actually act on.
	// Neither snapshot of the sender is safe alone. `Sequence` has to be the open one, or this signs
	// a sequence the ledger already consumed. The reserve inputs have to be the pessimistic pair:
	// the open ledger reflects pending CREDITS as well as debits, so a maximum sized against an
	// unvalidated credit offers money the account may not keep — `tecUNFUNDED_PAYMENT`, fee
	// destroyed and sequence consumed, which is what the reserve guard exists to prevent.
	// The destination is read from both ledgers for the same reason the sender is: a creation, a
	// deletion or an `lsfRequireDestTag` change living only in the open ledger may never validate,
	// and trusting it lets a below-reserve or untagged payment through to a fee-claiming `tec*`.
	describe('the two destination snapshots', () => {
		const sourceInfo = { balance: 50_000_000n, sequence: 7, ownerCount: 0, flags: 0 };
		const belowReserve = XRP_BASE_RESERVE_DROPS - 1n;

		// `undefined` means the node answered `actNotFound`; an Error means it could not answer.
		const destinationIn = ({
			current,
			validated
		}: {
			current: number | undefined | Error;
			validated: number | undefined | Error;
		}) =>
			vi.spyOn(xrplRest, 'loadXrpAccountInfo').mockImplementation(({ address, ledgerIndex }) => {
				if (address !== destination) {
					return Promise.resolve(sourceInfo);
				}

				const answer = ledgerIndex === 'current' ? current : validated;

				if (answer instanceof Error) {
					return Promise.reject(answer);
				}

				if (isNullish(answer)) {
					return Promise.reject(new XrpAccountNotFoundError('XRPL account not found'));
				}

				return Promise.resolve({ ...sourceInfo, flags: answer });
			});

		it('sends below the reserve to a destination settled in both ledgers', async () => {
			destinationIn({ current: 0, validated: 0 });

			await expect(sendXrp({ ...params, amount: belowReserve })).resolves.toBeDefined();
		});

		// A creation that has not validated can still be rolled back, at which point the payment is
		// applied as `tecNO_DST_INSUF_XRP`.
		it('declines below the reserve when the creation has not validated', async () => {
			destinationIn({ current: 0, validated: undefined });

			await expect(sendXrp({ ...params, amount: belowReserve })).rejects.toThrow(
				'does not exist yet'
			);
		});

		// The mirror direction, which requiring BOTH covers without a rule of its own: a deletion
		// that has not validated leaves the account equally unsettled.
		it('declines below the reserve when a deletion has not validated', async () => {
			destinationIn({ current: undefined, validated: 0 });

			await expect(sendXrp({ ...params, amount: belowReserve })).rejects.toThrow(
				'does not exist yet'
			);
		});

		// Either snapshot setting the bit is enough: a tag that turns out not to have been needed
		// costs nothing, while a missing one claims the fee.
		it.each([
			{ name: 'only the open ledger', current: 0x00020000, validated: 0 },
			{ name: 'only the validated ledger', current: 0, validated: 0x00020000 }
		])('requires a tag when $name sets the bit', async ({ current, validated }) => {
			destinationIn({ current, validated });

			await expect(sendXrp({ ...params, destinationTag: undefined })).rejects.toThrow(
				'requires a destination tag'
			);
		});

		// The tag requirement does NOT depend on the destination being settled: if the open ledger
		// says a tag is needed, one is needed as soon as that state validates, and asking for it
		// costs nothing. Sent above the reserve so the settled check is not what declines.
		it('requires a tag even when the destination is not settled', async () => {
			destinationIn({ current: 0x00020000, validated: undefined });

			await expect(
				sendXrp({ ...params, amount: XRP_BASE_RESERVE_DROPS, destinationTag: undefined })
			).rejects.toThrow('requires a destination tag');
		});

		it('does not require a tag when neither snapshot sets the bit', async () => {
			destinationIn({ current: 0, validated: 0 });

			await expect(sendXrp({ ...params, destinationTag: undefined })).resolves.toBeDefined();
		});

		// One unanswerable read is enough to make the pair unusable, and below the reserve that has
		// to propagate rather than be read as absence.
		it('propagates a one-sided unavailable read below the reserve', async () => {
			destinationIn({ current: 0, validated: new Error('tooBusy') });

			await expect(sendXrp({ ...params, amount: belowReserve })).rejects.toThrow('tooBusy');
		});

		// At or above the reserve the destination decides nothing, so an unanswerable read must not
		// block the send — the advisory half this guard has always had.
		it('ignores a one-sided unavailable read at or above the reserve', async () => {
			destinationIn({ current: 0, validated: new Error('tooBusy') });

			await expect(sendXrp({ ...params, amount: XRP_BASE_RESERVE_DROPS })).resolves.toBeDefined();
		});
	});

	describe('the two sender snapshots', () => {
		const snapshots = ({
			open,
			validated
		}: {
			// Both sides take the same fields: the sequence is now read from both snapshots, and the
			// validated one leading is exactly the case worth being able to express.
			open: Partial<XrpAccountInfo>;
			validated: Partial<XrpAccountInfo>;
		}) => {
			const base = { balance: 50_000_000n, sequence: 7, ownerCount: 0, flags: 0 };

			vi.spyOn(xrplRest, 'loadXrpAccountInfo').mockImplementation(({ address, ledgerIndex }) =>
				Promise.resolve(
					address === destination
						? base
						: { ...base, ...(ledgerIndex === 'current' ? open : validated) }
				)
			);
		};

		it('reads the sender from both ledgers', async () => {
			await sendXrp(params);

			expect(xrplRest.loadXrpAccountInfo).toHaveBeenCalledWith({
				address: source,
				network: XrpNetworks.mainnet,
				ledgerIndex: 'current'
			});
			expect(xrplRest.loadXrpAccountInfo).toHaveBeenCalledWith({
				address: source,
				network: XrpNetworks.mainnet,
				ledgerIndex: 'validated'
			});
		});

		// An incoming payment sitting in the open ledger. Sizing against it would offer 9 XRP the
		// account does not yet own.
		it('does not let an unvalidated credit raise the sendable maximum', async () => {
			snapshots({
				open: { balance: 11_000_000n },
				validated: { balance: 2_000_000n }
			});

			await expect(sendXrp({ ...params, amount: 9_000_000n })).rejects.toThrow(
				'exceeds the sendable maximum'
			);
		});

		// The other direction, and the reason this is the LOWER of the two rather than simply the
		// validated one: a pending outgoing payment makes the open balance the conservative figure,
		// and sizing against validated state would offer money already committed.
		it('does not let a validated balance ignore an unvalidated debit', async () => {
			snapshots({
				open: { balance: 2_000_000n },
				validated: { balance: 11_000_000n }
			});

			await expect(sendXrp({ ...params, amount: 9_000_000n })).rejects.toThrow(
				'exceeds the sendable maximum'
			);
		});

		// The mirror case: an object created in the open ledger raises the real reserve, so the
		// validated count understates it.
		it('does not let a validated owner count understate the reserve', async () => {
			snapshots({
				open: { balance: 2_000_000n, ownerCount: 4 },
				validated: { balance: 2_000_000n, ownerCount: 0 }
			});

			// Reserve with 4 owned objects is 1_000_000 + 4 x 200_000 = 1_800_000, leaving under
			// 200_000 sendable; with the validated count of 0 it would have looked like 1_000_000.
			await expect(sendXrp({ ...params, amount: 900_000n })).rejects.toThrow(
				'exceeds the sendable maximum'
			);
		});

		// And the sequence takes the higher of the two. The ordinary case is the open ledger being
		// ahead, which is why that read exists.
		it('signs the open-ledger sequence when it leads', async () => {
			snapshots({
				open: { sequence: 42 },
				validated: { sequence: 41 }
			});

			await sendXrp(params);

			expect(xrpSignServices.signXrpTransaction).toHaveBeenCalledWith(
				expect.objectContaining({ transaction: expect.objectContaining({ Sequence: 42 }) })
			);
		});

		// The two reads are concurrent calls that do not share an instant, so they can land either
		// side of a ledger close: `current` answered while a transaction is still unapplied reports
		// the old sequence, and `validated` answered after that close reports the new one. Signing
		// the open value then signs a sequence already consumed, which XRPL answers `tefPAST_SEQ`.
		//
		// Taking the maximum cannot overshoot — validated state is a subset of open state at any
		// one instant, and the sequence only increases — so it closes the gap without inventing one.
		it('signs the validated sequence when the reads crossed a ledger close', async () => {
			snapshots({
				open: { sequence: 42 },
				validated: { sequence: 43 }
			});

			await sendXrp(params);

			expect(xrpSignServices.signXrpTransaction).toHaveBeenCalledWith(
				expect.objectContaining({ transaction: expect.objectContaining({ Sequence: 43 }) })
			);
		});
	});

	// `LastLedgerSequence` is the index plus the offset, and that sum has to stay a `UInt32` even
	// though the index alone already is one. Otherwise the failure comes from inside the codec —
	// `must be >= 0 and <= 4294967295` — after the reads and the key derivation, and says nothing
	// about the index that caused it. Not reachable from a real ledger; this guards a node
	// reporting an index it has no business reporting.
	describe('the LastLedgerSequence ceiling', () => {
		const highest = XRP_MAX_UINT32 - XRP_LAST_LEDGER_SEQUENCE_OFFSET;

		it('signs at the highest index that still forms a UInt32', async () => {
			vi.spyOn(xrplRest, 'loadXrpLedgerIndex').mockResolvedValue(highest);
			vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(highest);

			await sendXrp(params);

			expect(xrpSignServices.signXrpTransaction).toHaveBeenCalledWith(
				expect.objectContaining({
					transaction: expect.objectContaining({ LastLedgerSequence: XRP_MAX_UINT32 })
				})
			);
		});

		it.each([highest + 1, XRP_MAX_UINT32])(
			'refuses the index %i before deriving a key',
			async (ledgerIndex) => {
				vi.spyOn(xrplRest, 'loadXrpLedgerIndex').mockResolvedValue(ledgerIndex);

				await expect(sendXrp(params)).rejects.toThrow('cannot form a UInt32 LastLedgerSequence');

				expect(xrpSignServices.getXrpSigningPublicKey).not.toHaveBeenCalled();
				expect(xrpSignServices.signXrpTransaction).not.toHaveBeenCalled();
			}
		);
	});

	describe('when the key is derived', () => {
		it('derives it for a send that passes every guard', async () => {
			await sendXrp(params);

			expect(xrpSignServices.getXrpSigningPublicKey).toHaveBeenCalledOnce();
		});

		it('does not derive it when the amount exceeds the sendable maximum', async () => {
			vi.spyOn(xrplRest, 'loadXrpAccountInfo').mockResolvedValue({
				balance: XRP_BASE_RESERVE_DROPS,
				sequence: 7,
				ownerCount: 0,
				flags: 0
			});

			await expect(sendXrp({ ...params, amount: 25_000_000n })).rejects.toThrow(
				'exceeds the sendable maximum'
			);

			expect(xrpSignServices.getXrpSigningPublicKey).not.toHaveBeenCalled();
		});

		it('does not derive it for a below-reserve payment to a destination that does not exist', async () => {
			const sourceInfo = { balance: 50_000_000n, sequence: 7, ownerCount: 0, flags: 0 };

			vi.spyOn(xrplRest, 'loadXrpAccountInfo').mockImplementation(async ({ address }) =>
				address === destination
					? await Promise.reject(new XrpAccountNotFoundError('XRPL account not found'))
					: await Promise.resolve(sourceInfo)
			);

			await expect(sendXrp({ ...params, amount: XRP_BASE_RESERVE_DROPS - 1n })).rejects.toThrow(
				'does not exist yet'
			);

			expect(xrpSignServices.getXrpSigningPublicKey).not.toHaveBeenCalled();
		});

		it('does not derive it for an untagged payment to a destination that requires a tag', async () => {
			const sourceInfo = { balance: 50_000_000n, sequence: 7, ownerCount: 0, flags: 0 };

			vi.spyOn(xrplRest, 'loadXrpAccountInfo').mockImplementation(({ address }) =>
				Promise.resolve(address === destination ? { ...sourceInfo, flags: 0x00020000 } : sourceInfo)
			);

			await expect(sendXrp({ ...params, destinationTag: undefined })).rejects.toThrow(
				'requires a destination tag'
			);

			expect(xrpSignServices.getXrpSigningPublicKey).not.toHaveBeenCalled();
		});
	});

	// A failure that provably precedes the broadcast must surface as itself, not as an ambiguous
	// send. The submit catch deliberately swallows transport and shape failures — those say nothing
	// about whether the node applied the blob — but nothing reaches it that is knowable beforehand:
	// the endpoint is resolved inside every RPC call, so an unconfigured one fails at the FIRST
	// account read, five calls before the submit.
	describe('a failure before anything is broadcast', () => {
		const configError = new Error(
			'No XRPL RPC endpoint is configured for this build. Set VITE_XRP_RPC_URL_MAINNET to a managed provider endpoint.'
		);

		it('surfaces as itself rather than as an indeterminate send', async () => {
			vi.spyOn(xrplRest, 'loadXrpAccountInfo').mockRejectedValue(configError);

			const err = await sendXrp(params).catch((e: unknown) => e);

			expect(err).toBe(configError);
			expect(err).not.toBeInstanceOf(XrpSendIndeterminateError);
		});

		it('signs nothing, submits nothing and confirms nothing', async () => {
			vi.spyOn(xrplRest, 'loadXrpAccountInfo').mockRejectedValue(configError);

			await sendXrp(params).catch(() => undefined);

			expect(xrpSignServices.signXrpTransaction).not.toHaveBeenCalled();
			expect(xrplRest.submitXrpTransaction).not.toHaveBeenCalled();
			expect(xrplRest.loadXrpTransactionOutcome).not.toHaveBeenCalled();
		});
	});

	// The ledger refuses a payment to its own sender — rippled's `Payment::preflight` answers
	// `temREDUNDANT` — but only after five RPC reads, a signing-key derivation, a threshold
	// signature and a broadcast. Nothing about the account state is needed to know it.
	describe('a payment to the sending account', () => {
		it('is refused before any work', async () => {
			await expect(sendXrp({ ...params, destination: params.source })).rejects.toThrow(
				'is the sending account'
			);

			expect(xrplRest.loadXrpAccountInfo).not.toHaveBeenCalled();
			expect(xrplRest.loadXrpLedgerIndex).not.toHaveBeenCalled();
			expect(xrpSignServices.getXrpSigningPublicKey).not.toHaveBeenCalled();
			expect(xrpSignServices.signXrpTransaction).not.toHaveBeenCalled();
			expect(xrplRest.submitXrpTransaction).not.toHaveBeenCalled();
		});

		// Raw comparison, like the `Account` binding in the reads: a classic address is base58 over
		// a checksummed payload, so two forms differing only in case are not one address.
		it('does not refuse a destination differing from the source in case', async () => {
			await expect(
				sendXrp({ ...params, destination: params.source.toUpperCase() })
			).resolves.toBeDefined();
		});
	});

	describe('the amount and fee bounds', () => {
		// Refused from the arguments, before any RPC or signing. `Amount: '0'` encodes fine, so this
		// otherwise costs a threshold signature and a submit to learn `temBAD_AMOUNT` from the
		// ledger; a negative one throws `-5 is an illegal amount` out of the codec, which tells the
		// user nothing.
		it.each([ZERO, -1n])('refuses the amount %s drops before any work', async (amount) => {
			await expect(sendXrp({ ...params, amount })).rejects.toThrow(
				'XRP amount must be greater than zero'
			);

			expect(xrplRest.loadXrpAccountInfo).not.toHaveBeenCalled();
			expect(xrpSignServices.getXrpSigningPublicKey).not.toHaveBeenCalled();
			expect(xrpSignServices.signXrpTransaction).not.toHaveBeenCalled();
			expect(xrplRest.submitXrpTransaction).not.toHaveBeenCalled();
		});

		it.each([ZERO, -1n])('refuses the fee %s drops before any work', async (fee) => {
			await expect(sendXrp({ ...params, fee })).rejects.toThrow(
				'XRP fee must be greater than zero'
			);

			expect(xrplRest.loadXrpAccountInfo).not.toHaveBeenCalled();
			expect(xrpSignServices.signXrpTransaction).not.toHaveBeenCalled();
		});

		// The reason the fee bound is not merely tidiness: the fee is SUBTRACTED in
		// `getXrpMaxAmount`, so a negative one raises the maximum the reserve guard enforces. Here
		// the balance is the reserve exactly, so nothing is sendable — and a -10_000_000 fee would
		// make 9 XRP look sendable.
		it('does not let a negative fee raise the sendable maximum', async () => {
			vi.spyOn(xrplRest, 'loadXrpAccountInfo').mockResolvedValue({
				balance: XRP_BASE_RESERVE_DROPS,
				sequence: 7,
				ownerCount: 0,
				flags: 0
			});

			await expect(sendXrp({ ...params, amount: 9_000_000n, fee: -10_000_000n })).rejects.toThrow(
				'XRP fee must be greater than zero'
			);
		});
	});

	describe('the destination tag bounds', () => {
		// All of these are type-legal `number`s that die inside `ripple-binary-codec` — after the
		// account read, the ledger read and the threshold signing-key call.
		it.each([-1, 1.5, NaN, Infinity, XRP_MAX_DESTINATION_TAG + 1])(
			'refuses the tag %j before any work',
			async (destinationTag) => {
				await expect(sendXrp({ ...params, destinationTag })).rejects.toThrow(
					'XRP destination tag must be an unsigned 32-bit integer'
				);

				expect(xrplRest.loadXrpAccountInfo).not.toHaveBeenCalled();
				expect(xrpSignServices.getXrpSigningPublicKey).not.toHaveBeenCalled();
				expect(xrpSignServices.signXrpTransaction).not.toHaveBeenCalled();
				expect(xrplRest.submitXrpTransaction).not.toHaveBeenCalled();
			}
		);

		// Both ends are real tags. `0` in particular is not an absent tag — `buildXrpPayment` goes
		// out of its way to keep an omitted one from becoming `0`.
		it.each([0, 1, XRP_MAX_DESTINATION_TAG])('sends with the valid tag %j', async (tag) => {
			await sendXrp({ ...params, destinationTag: tag });

			expect(xrpSignServices.signXrpTransaction).toHaveBeenCalledWith(
				expect.objectContaining({
					transaction: expect.objectContaining({ DestinationTag: tag })
				})
			);
		});

		// An omitted tag must still omit the field rather than send `0`.
		it('omits the field when no tag is given', async () => {
			await sendXrp({ ...params, destinationTag: undefined });

			expect(xrpSignServices.signXrpTransaction).toHaveBeenCalledWith(
				expect.objectContaining({
					transaction: expect.not.objectContaining({ DestinationTag: expect.anything() })
				})
			);
		});

		// The sharper half of the finding: the required-tag guard asks only whether a tag is
		// nullish, so a value that cannot become a tag was counting as having supplied one and
		// suppressing the decline. Now it never gets that far.
		it('does not let a bogus tag satisfy a destination that requires one', async () => {
			vi.spyOn(xrplRest, 'loadXrpAccountInfo').mockResolvedValue({
				balance: 50_000_000n,
				sequence: 7,
				ownerCount: 0,
				flags: 0x00020000
			});

			await expect(sendXrp({ ...params, destinationTag: NaN })).rejects.toThrow(
				'XRP destination tag must be an unsigned 32-bit integer'
			);
		});
	});

	describe('a destination that requires a tag', () => {
		const sourceInfo = { balance: 50_000_000n, sequence: 7, ownerCount: 0, flags: 0 };

		// `lsfRequireDestTag`. Set by exchanges and other shared accounts, where the tag is what
		// credits the payment to a customer.
		const REQUIRE_DEST_TAG = 0x00020000;
		// `lsfDefaultRipple` — an unrelated bit, so a flags value being truthy is not enough.
		const OTHER_FLAG = 0x00800000;

		const mockDestinationFlags = (flags: number) =>
			vi
				.spyOn(xrplRest, 'loadXrpAccountInfo')
				.mockImplementation(({ address }) =>
					Promise.resolve(address === destination ? { ...sourceInfo, flags } : sourceInfo)
				);

		// XRPL applies an untagged payment to such an account as `tecDST_TAG_NEEDED`: the fee is
		// destroyed and the sequence consumed, out of a response the send already had in hand.
		it('refuses an untagged payment before signing', async () => {
			mockDestinationFlags(REQUIRE_DEST_TAG);

			await expect(sendXrp({ ...params, destinationTag: undefined })).rejects.toThrow(
				'requires a destination tag'
			);

			expect(xrpSignServices.signXrpTransaction).not.toHaveBeenCalled();
			expect(xrplRest.submitXrpTransaction).not.toHaveBeenCalled();
		});

		it('sends when the tag the destination requires is supplied', async () => {
			mockDestinationFlags(REQUIRE_DEST_TAG);

			await expect(sendXrp({ ...params, destinationTag: 12345 })).resolves.toBeDefined();
		});

		// A bit test, not a truthiness test: an account with unrelated flags set requires nothing.
		it('sends untagged when the flags do not include the required-tag bit', async () => {
			mockDestinationFlags(OTHER_FLAG);

			await expect(sendXrp({ ...params, destinationTag: undefined })).resolves.toBeDefined();
		});

		// What an account with nothing set actually reports. A node that OMITS `Flags` no longer
		// reaches here at all: the response fails the parse, so the destination read reports an
		// unanswerable lookup rather than a snapshot claiming no requirement — the case below.
		it('sends untagged when the destination sets no flags at all', async () => {
			mockDestinationFlags(0);

			await expect(sendXrp({ ...params, destinationTag: undefined })).resolves.toBeDefined();
		});

		// This guard was advisory once, on the argument that almost every send omits a tag so
		// declining on an unanswered lookup would let a busy node stop ordinary sends. That covered
		// a node which did not reply; it did not cover one replying with something unusable, which
		// arrives here identically and was letting an untagged payment through to
		// `tecDST_TAG_NEEDED`. A requirement can only be ruled OUT by an answer, so unknown is not
		// "no" — and the node's own error is what reaches the caller.
		it('refuses an untagged send when the destination lookup could not be made', async () => {
			vi.spyOn(xrplRest, 'loadXrpAccountInfo').mockImplementation(({ address }) =>
				address === destination ? Promise.reject(new Error('tooBusy')) : Promise.resolve(sourceInfo)
			);

			await expect(sendXrp({ ...params, destinationTag: undefined })).rejects.toThrow('tooBusy');

			expect(xrpSignServices.signXrpTransaction).not.toHaveBeenCalled();
		});

		// The specific shape the required-`Flags` change produces: a snapshot the schema rejects
		// arrives as an unusable read, not as a snapshot claiming no requirement.
		it('refuses an untagged send when a destination snapshot is malformed', async () => {
			vi.spyOn(xrplRest, 'loadXrpAccountInfo').mockImplementation(({ address }) =>
				address === destination
					? Promise.reject(
							new Error(
								'Unexpected XRPL account_info response: it does not match the expected shape'
							)
						)
					: Promise.resolve(sourceInfo)
			);

			await expect(sendXrp({ ...params, destinationTag: undefined })).rejects.toThrow(
				'does not match the expected shape'
			);

			expect(xrpSignServices.signXrpTransaction).not.toHaveBeenCalled();
		});

		// A supplied tag settles the requirement whatever the flags say, so an unusable read must
		// not block a send that already carries one.
		it('sends with a tag even when the destination lookup could not be made', async () => {
			vi.spyOn(xrplRest, 'loadXrpAccountInfo').mockImplementation(({ address }) =>
				address === destination ? Promise.reject(new Error('tooBusy')) : Promise.resolve(sourceInfo)
			);

			await expect(sendXrp({ ...params, destinationTag: 12345 })).resolves.toBeDefined();
		});
	});

	describe('an unfunded destination', () => {
		const sourceInfo = { balance: 50_000_000n, sequence: 7, ownerCount: 0, flags: 0 };

		// The node's `actNotFound` for the destination is the only thing that means unfunded.
		const mockDestination = (
			destinationOutcome: () => Promise<never> | Promise<typeof sourceInfo>
		) =>
			vi
				.spyOn(xrplRest, 'loadXrpAccountInfo')
				.mockImplementation(async ({ address }) =>
					address === destination ? await destinationOutcome() : sourceInfo
				);

		const notFound = () => Promise.reject(new XrpAccountNotFoundError('XRPL account not found'));

		// XRPL answers a payment too small to create the account with `tecNO_DST_INSUF_XRP`, which is
		// APPLIED: the payment fails and the fee is claimed. Refusing before signing turns a charged
		// failure into a plain error.
		it('refuses an amount below the account reserve before signing', async () => {
			mockDestination(notFound);

			await expect(sendXrp({ ...params, amount: XRP_BASE_RESERVE_DROPS - 1n })).rejects.toThrow(
				'does not exist yet'
			);

			expect(xrpSignServices.signXrpTransaction).not.toHaveBeenCalled();
			expect(xrplRest.submitXrpTransaction).not.toHaveBeenCalled();
		});

		it('sends an amount that covers the account reserve', async () => {
			mockDestination(notFound);

			await expect(sendXrp({ ...params, amount: XRP_BASE_RESERVE_DROPS })).resolves.toBeDefined();
		});

		// A drained account still exists, and receiving XRP carries no reserve requirement — so a
		// zero balance must NOT be read as unfunded.
		it('does not restrict the amount when the destination exists with a zero balance', async () => {
			mockDestination(() => Promise.resolve({ ...sourceInfo, balance: ZERO }));

			await expect(sendXrp({ ...params, amount: 1n })).resolves.toBeDefined();
		});

		// At or above the reserve the destination's existence changes nothing, so failing to read it
		// must not block the send.
		it.each(['tooBusy', 'XRPL account_info request failed with status 503'])(
			'sends anyway when the destination read fails with %s',
			async (message) => {
				mockDestination(() => Promise.reject(new Error(message)));

				await expect(sendXrp({ ...params, amount: XRP_BASE_RESERVE_DROPS })).resolves.toBeDefined();
			}
		);

		// Below the reserve the answer decides the outcome, so an unavailable lookup must not be read
		// as "exists": proceeding takes the `tecNO_DST_INSUF_XRP` that claims the fee and burns the
		// sequence.
		it('refuses an amount below the account reserve when the destination read fails', async () => {
			mockDestination(() => Promise.reject(new Error('tooBusy')));

			await expect(sendXrp({ ...params, amount: XRP_BASE_RESERVE_DROPS - 1n })).rejects.toThrow(
				'tooBusy'
			);

			expect(xrpSignServices.signXrpTransaction).not.toHaveBeenCalled();
			expect(xrplRest.submitXrpTransaction).not.toHaveBeenCalled();
		});
	});

	// `XRP_CONFIRM_MAX_ATTEMPTS` and the ledger-read skip are both computed from this interval, so
	// they are only correct if the loop actually waits it. Leaving it to `randomWait`'s defaults
	// would make the two agree by coincidence, and a change there would break them silently.
	it('waits the interval its derived budgets assume', async () => {
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome')
			.mockResolvedValueOnce({ state: 'absent' })
			.mockResolvedValue({ state: 'validated', transactionResult: 'tesSUCCESS' });

		await sendXrp(params);

		expect(randomWait).toHaveBeenCalledWith({
			min: XRP_CONFIRM_MIN_POLL_MS,
			max: XRP_CONFIRM_MAX_POLL_MS
		});
	});

	describe('the validated-ledger read', () => {
		// The index moves once per ~4s close while this loop polls every 1-2s, so asking on every
		// answered poll spends calls that cannot change the outcome. One read says how many closes
		// are still needed; the next is due only after roughly that many polls.
		it('reads the ledger only as often as it can have moved', async () => {
			const validatesOnAttempt = 50;
			let attempts = 0;

			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockImplementation(() => {
				attempts++;

				return Promise.resolve(
					attempts < validatesOnAttempt
						? { state: 'absent' }
						: { state: 'validated', transactionResult: 'tesSUCCESS' }
				);
			});
			// 20 closes short of expiry, so each read buys 40 polls of silence.
			vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(1000);

			await expect(sendXrp(params)).resolves.toBeDefined();

			expect(attempts).toBe(validatesOnAttempt);
			expect(xrplRest.loadXrpValidatedLedgerIndex).toHaveBeenCalledTimes(2);
		});

		// Backing off on a read that never happened would delay the definitive expiry answer on the
		// strength of no evidence at all.
		it('does not back off after a read the node could not answer', async () => {
			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({ state: 'absent' });
			vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex')
				.mockRejectedValueOnce(new Error('XRPL ledger request failed with status 503'))
				.mockResolvedValue(1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET + 1);

			await expect(sendXrp(params)).rejects.toBeInstanceOf(XrpSendExpiredError);

			// Attempt 0 was refused, attempt 1 answered and settled it.
			expect(xrplRest.loadXrpValidatedLedgerIndex).toHaveBeenCalledTimes(2);
		});

		// Once the index is past expiry there is nothing left to wait for.
		it('still settles expiry on the first answered read', async () => {
			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({ state: 'absent' });
			vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(
				1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET + 1
			);

			await expect(sendXrp(params)).rejects.toBeInstanceOf(XrpSendExpiredError);

			expect(xrplRest.loadXrpValidatedLedgerIndex).toHaveBeenCalledOnce();
		});
	});

	// The fee is untrusted input and escalates with load, so an excessive estimate must not be
	// signed for an amount the user never reviewed.
	it('refuses to sign a fee above the maximum', async () => {
		await expect(sendXrp({ ...params, fee: XRP_MAX_FEE_DROPS + 1n })).rejects.toThrow(
			'exceeds the maximum'
		);
	});

	it('accepts a fee at the maximum', async () => {
		await expect(sendXrp({ ...params, fee: XRP_MAX_FEE_DROPS })).resolves.toBeDefined();
	});

	// The reviewed fee must be the signed fee: re-fetching it here would sign a figure the user
	// never saw, and the caller's own max-amount arithmetic would no longer hold.
	it('signs the fee it was given rather than an estimate', async () => {
		vi.spyOn(xrplRest, 'loadXrpOpenLedgerFee').mockResolvedValue(9_999n);

		await sendXrp({ ...params, fee: 7n });

		expect(xrpSignServices.signXrpTransaction).toHaveBeenCalledWith(
			expect.objectContaining({ transaction: expect.objectContaining({ Fee: '7' }) })
		);
		expect(xrplRest.loadXrpOpenLedgerFee).not.toHaveBeenCalled();
	});

	it('does not reach DONE when the transaction fails', async () => {
		const progress = vi.fn();

		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({
			state: 'validated',
			transactionResult: 'tecUNFUNDED_PAYMENT'
		});

		await expect(sendXrp({ ...params, progress })).rejects.toThrow('XRP transaction failed');

		expect(progress.mock.calls.map(([step]) => step)).not.toContain(ProgressStepsSendXrp.DONE);
	});
});
