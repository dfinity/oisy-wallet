import { ZERO } from '$lib/constants/app.constants';
import { ProgressStepsSendXrp } from '$lib/enums/progress-steps';
import { mockIdentity } from '$tests/mocks/identity.mock';
import {
	XRP_BASE_RESERVE_DROPS,
	XRP_LAST_LEDGER_SEQUENCE_OFFSET,
	XRP_MAX_FEE_DROPS
} from '$xrp/constants/xrp.constants';
import * as xrplRest from '$xrp/rest/xrpl.rest';
import { XrpAccountNotFoundError } from '$xrp/rest/xrpl.rest';
import { sendXrp } from '$xrp/services/xrp-send.services';
import * as xrpSignServices from '$xrp/services/xrp-sign.services';
import { XrpNetworks } from '$xrp/types/network';
import { XrpSendExpiredError, XrpSendIndeterminateError } from '$xrp/types/xrp-send';

vi.mock('$lib/utils/time.utils', () => ({
	randomWait: vi.fn()
}));

describe('xrp-send.services', () => {
	const source = 'rLUEXYuLiQptky37CqLcm9USQpPiz5rkpD';
	const destination = 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe';
	const signingPublicKey = 'ED01FA53FA5A7E77798F882ECE20B1ABC00BB358A9E55A202D0D0676BD0CE37A63';
	// Must be real hex: the transaction id is derived from these bytes.
	const signedBlob = '1200002280000000240000000761400000000098968068400000000000000C';

	const params = {
		identity: mockIdentity,
		network: XrpNetworks.mainnet,
		source,
		destination,
		amount: 25_000_000n,
		destinationTag: 12345
	};

	beforeEach(() => {
		vi.clearAllMocks();

		// Every RPC this path makes is mocked below; anything that slips through would otherwise
		// reach the public cluster, since the test env resolves `XRP_RPC_HTTP_URL_MAINNET` to it.
		vi.stubGlobal('fetch', () => Promise.reject(new Error('unexpected network call in a test')));

		vi.spyOn(xrplRest, 'loadXrpAccountInfo').mockResolvedValue({
			balance: 50_000_000n,
			sequence: 7,
			ownerCount: 0
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
			validated: true,
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

	it('waits for the transaction to be validated', async () => {
		const { txHash } = await sendXrp(params);

		expect(xrplRest.loadXrpTransactionOutcome).toHaveBeenCalledWith({
			hash: txHash,
			network: XrpNetworks.mainnet,
			firstLedgerSequence: 1000,
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
			firstLedgerSequence: 1000,
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
			firstLedgerSequence: 1000,
			lastLedgerSequence: 1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET
		});
	});

	it('reports expiry rather than failure when a lost submit never appears', async () => {
		vi.spyOn(xrplRest, 'submitXrpTransaction').mockRejectedValue(new Error('network down'));
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({
			validated: false,
			transactionResult: undefined
		});
		vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(
			1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET + 1
		);

		await expect(sendXrp(params)).rejects.toThrow('XRP transaction expired');
	});

	// A response we understood is authoritative, so it must not be polled around.
	it('fails immediately on a deterministic engine rejection', async () => {
		vi.spyOn(xrplRest, 'submitXrpTransaction').mockResolvedValue({
			engineResult: 'temBAD_FEE',
			accepted: false
		});

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
			validated: true,
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
			validated: true,
			transactionResult: 'tecUNFUNDED_PAYMENT'
		});

		await expect(sendXrp(params)).rejects.toThrow('XRP transaction failed: tecUNFUNDED_PAYMENT');

		expect(xrplRest.loadXrpTransactionOutcome).toHaveBeenCalled();
	});

	// `tefALREADY` reports that an earlier submission of this exact blob already applied, so the
	// send must reach confirmation: rejecting here would report a completed payment as unsent and
	// invite a retry that pays a second time.
	it('confirms tefALREADY instead of reporting the payment unsent', async () => {
		vi.spyOn(xrplRest, 'submitXrpTransaction').mockResolvedValue({
			engineResult: 'tefALREADY',
			accepted: false
		});

		await expect(sendXrp(params)).resolves.toBeDefined();

		expect(xrplRest.loadXrpTransactionOutcome).toHaveBeenCalled();
	});

	// `tef` may be reapplied and `tel` may be cached and retried, so neither is proof the payment
	// will not happen. Reporting them as failed would invite a retry that pays twice; they are
	// polled to expiry instead, which is definitive and safe to send again after.
	it.each(['tefPAST_SEQ', 'tefMAX_LEDGER', 'telINSUF_FEE_P'])(
		'polls %s to expiry rather than reporting it rejected',
		async (engineResult) => {
			vi.spyOn(xrplRest, 'submitXrpTransaction').mockResolvedValue({
				engineResult,
				accepted: false
			});
			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({
				validated: false,
				transactionResult: undefined
			});
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
			vi.spyOn(xrplRest, 'submitXrpTransaction').mockResolvedValue({
				engineResult,
				accepted: true
			});

			await expect(sendXrp(params)).rejects.toThrow('XRP transaction rejected');

			expect(xrplRest.loadXrpTransactionOutcome).not.toHaveBeenCalled();
		}
	);

	// A validated transaction is only final; `tec*` results are validated too.
	it('throws when the transaction is validated with a failing result', async () => {
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({
			validated: true,
			transactionResult: 'tecUNFUNDED_PAYMENT'
		});

		await expect(sendXrp(params)).rejects.toThrow('XRP transaction failed: tecUNFUNDED_PAYMENT');
	});

	// The failure is terminal, so it must surface at once instead of being retried.
	it('does not retry a validated failure', async () => {
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({
			validated: true,
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
					? { validated: false, transactionResult: undefined }
					: { validated: true, transactionResult: 'tesSUCCESS' }
			);
		});

		await expect(sendXrp(params)).resolves.toBeDefined();

		expect(attempts).toBe(validatesOnAttempt);
	});

	// Only once the ledger has passed the LastLedgerSequence is non-inclusion final.
	it('fails once the transaction can no longer be included', async () => {
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({
			validated: false,
			transactionResult: undefined
		});
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
			.mockResolvedValueOnce({ validated: false, transactionResult: undefined })
			.mockResolvedValue({ validated: true, transactionResult: 'tesSUCCESS' });

		vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(
			1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET + 1
		);

		await expect(sendXrp(params)).resolves.toBeDefined();
	});

	it('still expires when the recheck does not find the payment', async () => {
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({
			validated: false,
			transactionResult: undefined
		});

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
			.mockResolvedValueOnce({ validated: false, transactionResult: undefined })
			.mockRejectedValue(new Error('Unexpected XRPL tx response: tooBusy'));

		vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(
			1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET + 1
		);

		await expect(sendXrp(params)).rejects.toThrow('Unexpected XRPL tx response: tooBusy');

		await expect(sendXrp(params)).rejects.not.toThrow('expired');
	});

	// A lookup the node could not answer establishes nothing, so it must cost an attempt rather
	// than abort a confirmation that still has budget left.
	it('keeps polling after a lookup the node could not answer', async () => {
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome')
			.mockRejectedValueOnce(new Error('Unexpected XRPL tx response: tooBusy'))
			.mockResolvedValue({ validated: true, transactionResult: 'tesSUCCESS' });

		vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(1000);

		await expect(sendXrp(params)).resolves.toBeDefined();
	});

	// The blob may already be accepted by the time this runs, so aborting on a failed ledger call
	// would report a payment that can still validate as failed.
	it('keeps polling after a validated-ledger call the node could not answer', async () => {
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome')
			.mockResolvedValueOnce({ validated: false, transactionResult: undefined })
			.mockResolvedValue({ validated: true, transactionResult: 'tesSUCCESS' });

		vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex')
			.mockRejectedValueOnce(new Error('XRPL ledger request failed with status 503'))
			.mockResolvedValue(1000);

		await expect(sendXrp(params)).resolves.toBeDefined();
	});

	// An unanswered ledger call establishes nothing, so it must not skip the expiry it would have
	// established either: the run ends in the indeterminate error, not in a claim of failure.
	it('ends indeterminate when the validated-ledger call is never answered', async () => {
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({
			validated: false,
			transactionResult: undefined
		});
		vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockRejectedValue(
			new Error('XRPL ledger request failed with status 503')
		);

		await expect(sendXrp(params)).rejects.toThrow(
			'XRP transaction confirmation stopped before its ledger expiry was reached.'
		);
	});

	// A validated failure found by the recheck must surface as a failure, not as an expiry.
	it('reports a tec failure found by the recheck', async () => {
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome')
			.mockResolvedValueOnce({ validated: false, transactionResult: undefined })
			.mockResolvedValue({ validated: true, transactionResult: 'tecUNFUNDED_PAYMENT' });

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
			.mockResolvedValueOnce({ validated: false, transactionResult: undefined })
			.mockResolvedValueOnce({ validated: false, transactionResult: undefined })
			.mockResolvedValue({ validated: true, transactionResult: 'tesSUCCESS' });

		// The signing-time call sets LastLedgerSequence to 1020; any LATER read of the open index
		// answers 1025, which is past it. The validated index — the only correct basis — is 1000.
		vi.spyOn(xrplRest, 'loadXrpLedgerIndex')
			.mockResolvedValueOnce(1000)
			.mockResolvedValue(1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET + 5);
		vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(1000);

		await expect(sendXrp(params)).resolves.toBeDefined();
	});

	describe('retrying an indeterminate send', () => {
		// The whole point: a retry must be able to resubmit THIS transaction. If the outcome is
		// unknown and the error does not carry it, the only possible retry builds a new transaction
		// from a fresh sequence — a second, independent payment.
		it('hands back the signed transaction when the outcome is never established', async () => {
			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({
				validated: false,
				transactionResult: undefined
			});
			vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(1000);

			const err = await sendXrp(params).catch((e: unknown) => e);

			expect(err).toBeInstanceOf(XrpSendIndeterminateError);
			expect((err as XrpSendIndeterminateError).pending).toEqual({
				txBlob: signedBlob,
				txHash: expect.stringMatching(/^[0-9A-F]{64}$/),
				// The window a retry must poll: the open index at signing through its expiry.
				firstLedgerSequence: 1000,
				lastLedgerSequence: 1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET
			});
		});

		// Expiry is the opposite case: the transaction can never apply, so a retry MUST build a new
		// one and carrying this one would be wrong.
		it('reports expiry as its own error, with nothing to resubmit', async () => {
			vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({
				validated: false,
				transactionResult: undefined
			});
			vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(
				1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET + 1
			);

			const err = await sendXrp(params).catch((e: unknown) => e);

			expect(err).toBeInstanceOf(XrpSendExpiredError);
			expect(err).not.toBeInstanceOf(XrpSendIndeterminateError);
		});

		it('resubmits the stored transaction instead of building a new one', async () => {
			const pending = {
				txBlob: '1200002280000000240000000861400000000098968068400000000000000C',
				txHash: 'A'.repeat(64),
				firstLedgerSequence: 4300,
				lastLedgerSequence: 4321
			};

			await sendXrp({ ...params, pending });

			expect(xrplRest.submitXrpTransaction).toHaveBeenCalledExactlyOnceWith({
				txBlob: pending.txBlob,
				network: XrpNetworks.mainnet
			});
			expect(xrplRest.loadXrpTransactionOutcome).toHaveBeenCalledWith({
				hash: pending.txHash,
				network: XrpNetworks.mainnet,
				firstLedgerSequence: pending.firstLedgerSequence,
				lastLedgerSequence: pending.lastLedgerSequence
			});

			// Nothing is fetched, rebuilt or re-signed: a new sequence would make this a different
			// transaction, which is the duplicate payment this exists to prevent.
			expect(xrplRest.loadXrpAccountInfo).not.toHaveBeenCalled();
			expect(xrplRest.loadXrpLedgerIndex).not.toHaveBeenCalled();
			expect(xrpSignServices.signXrpTransaction).not.toHaveBeenCalled();
		});

		// The payoff: the first attempt did land. Resubmitting the same blob is refused as already
		// applied, and the poll reports the original transaction's real outcome.
		it('reports the original outcome when the resubmitted transaction already applied', async () => {
			const pending = {
				txBlob: '1200002280000000240000000861400000000098968068400000000000000C',
				txHash: 'B'.repeat(64),
				firstLedgerSequence: 4300,
				lastLedgerSequence: 4321
			};

			vi.spyOn(xrplRest, 'submitXrpTransaction').mockResolvedValue({
				engineResult: 'tefALREADY',
				accepted: false
			});

			await expect(sendXrp({ ...params, pending })).resolves.toEqual({
				txHash: pending.txHash,
				submitResult: { engineResult: 'tefALREADY', accepted: false }
			});
		});
	});

	describe('an unfunded destination', () => {
		const sourceInfo = { balance: 50_000_000n, sequence: 7, ownerCount: 0 };

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

		// The check is advisory: failing to make it must not block a send to a well-funded address.
		it.each(['tooBusy', 'XRPL account_info request failed with status 503'])(
			'sends anyway when the destination read fails with %s',
			async (message) => {
				mockDestination(() => Promise.reject(new Error(message)));

				await expect(sendXrp({ ...params, amount: 1n })).resolves.toBeDefined();
			}
		);
	});

	// The fee is untrusted input and escalates with load, so an excessive estimate must not be
	// signed for an amount the user never reviewed.
	it('refuses to sign a fee above the maximum', async () => {
		vi.spyOn(xrplRest, 'loadXrpOpenLedgerFee').mockResolvedValue(XRP_MAX_FEE_DROPS + 1n);

		await expect(sendXrp(params)).rejects.toThrow('exceeds the maximum');
	});

	it('accepts a fee at the maximum', async () => {
		vi.spyOn(xrplRest, 'loadXrpOpenLedgerFee').mockResolvedValue(XRP_MAX_FEE_DROPS);

		await expect(sendXrp(params)).resolves.toBeDefined();
	});

	it('does not reach DONE when the transaction fails', async () => {
		const progress = vi.fn();

		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({
			validated: true,
			transactionResult: 'tecUNFUNDED_PAYMENT'
		});

		await expect(sendXrp({ ...params, progress })).rejects.toThrow('XRP transaction failed');

		expect(progress.mock.calls.map(([step]) => step)).not.toContain(ProgressStepsSendXrp.DONE);
	});
});
