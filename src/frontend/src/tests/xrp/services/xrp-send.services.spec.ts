import { ProgressStepsSendXrp } from '$lib/enums/progress-steps';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { XRP_LAST_LEDGER_SEQUENCE_OFFSET, XRP_MAX_FEE_DROPS } from '$xrp/constants/xrp.constants';
import * as xrplRest from '$xrp/rest/xrpl.rest';
import { sendXrp } from '$xrp/services/xrp-send.services';
import * as xrpSignServices from '$xrp/services/xrp-sign.services';
import { XrpNetworks } from '$xrp/types/network';
import { XrpTransactionFailedError } from '$xrp/types/xrp-send';

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
		fee: 12n,
		destinationTag: 12345
	};

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(xrplRest, 'loadXrpAccountInfo').mockResolvedValue({
			balance: 50_000_000n,
			sequence: 7,
			ownerCount: 0
		});
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

	it('builds the payment from the reviewed fee and fetched sequence/ledger, then signs it', async () => {
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
			network: XrpNetworks.mainnet
		});
	});

	// A transport or shape failure says nothing about whether the node applied the blob.
	it('still confirms when the submit response is lost', async () => {
		vi.spyOn(xrplRest, 'submitXrpTransaction').mockRejectedValue(new Error('network down'));

		const { txHash, submitResult } = await sendXrp(params);

		expect(submitResult).toBeUndefined();
		expect(xrplRest.loadXrpTransactionOutcome).toHaveBeenCalledWith({
			hash: txHash,
			network: XrpNetworks.mainnet
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

	it('throws when the node rejects the transaction', async () => {
		vi.spyOn(xrplRest, 'submitXrpTransaction').mockResolvedValue({
			engineResult: 'tecUNFUNDED_PAYMENT',
			accepted: false
		});

		await expect(sendXrp(params)).rejects.toThrow('tecUNFUNDED_PAYMENT');
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

	// Never applied, so there is nothing to confirm.
	it.each(['temBAD_FEE', 'tefPAST_SEQ', 'tefMAX_LEDGER', 'telINSUF_FEE_P'])(
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
	it('keeps polling beyond ten attempts while the transaction can still be included', async () => {
		const validatesOnAttempt = 15;
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
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome')
			.mockResolvedValueOnce({ validated: false, transactionResult: undefined })
			.mockResolvedValue({ validated: true, transactionResult: 'tesSUCCESS' });

		vi.spyOn(xrplRest, 'loadXrpLedgerIndex').mockResolvedValue(
			1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET + 5
		);
		vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(1000);

		await expect(sendXrp(params)).resolves.toBeDefined();
	});

	// The fee is untrusted input and escalates with load, so an excessive estimate must not be
	// signed for an amount the user never reviewed.
	it('refuses to sign a fee above the maximum', async () => {
		await expect(sendXrp({ ...params, fee: XRP_MAX_FEE_DROPS + 1n })).rejects.toThrow(
			'exceeds the maximum'
		);
	});

	// The reviewed fee must be the signed fee: re-fetching here would sign a figure the user
	// never saw and could push the total past the balance despite the caller's check.
	it('signs the fee it was given rather than fetching one', async () => {
		const spyFee = vi.spyOn(xrplRest, 'loadXrpOpenLedgerFee');

		await sendXrp({ ...params, fee: 4_321n });

		expect(spyFee).not.toHaveBeenCalled();
		expect(xrpSignServices.signXrpTransaction).toHaveBeenCalledWith(
			expect.objectContaining({ transaction: expect.objectContaining({ Fee: '4321' }) })
		);
	});

	it('accepts a fee at the maximum', async () => {
		await expect(sendXrp({ ...params, fee: XRP_MAX_FEE_DROPS })).resolves.toBeDefined();
	});

	// Typed so the wizard can tell a validated failure from an indeterminate confirmation: both
	// happen at the CONFIRM step, so the step alone cannot separate them.
	it('rejects a validated tec failure with XrpTransactionFailedError', async () => {
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({
			validated: true,
			transactionResult: 'tecUNFUNDED_PAYMENT'
		});

		await expect(sendXrp(params)).rejects.toBeInstanceOf(XrpTransactionFailedError);
	});

	it('does not use that type for an indeterminate expiry', async () => {
		vi.spyOn(xrplRest, 'loadXrpTransactionOutcome').mockResolvedValue({
			validated: false,
			transactionResult: undefined
		});
		vi.spyOn(xrplRest, 'loadXrpValidatedLedgerIndex').mockResolvedValue(
			1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET + 1
		);

		const promise = sendXrp(params);

		await expect(promise).rejects.toThrow('XRP transaction expired');
		await expect(promise).rejects.not.toBeInstanceOf(XrpTransactionFailedError);
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
