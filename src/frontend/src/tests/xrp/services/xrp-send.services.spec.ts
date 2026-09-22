import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import * as backendApi from '$lib/api/backend.api';
import { ZERO } from '$lib/constants/app.constants';
import { ProgressStepsSendXrp } from '$lib/enums/progress-steps';
import * as activeUserTransactionsServices from '$lib/services/active-user-transactions.services';
import { randomWait } from '$lib/utils/time.utils';
import {
	mockLiquidiumActiveUserTransaction,
	mockXrpActiveUserTransaction,
	mockXrpData
} from '$tests/mocks/active-user-transactions.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import {
	XRP_BASE_RESERVE_DROPS,
	XRP_LAST_LEDGER_SEQUENCE_OFFSET,
	XRP_MAX_DESTINATION_TAG,
	XRP_MAX_UINT32
} from '$xrp/constants/xrp.constants';
import { XrpRpcNotConfiguredError } from '$xrp/providers/xrp-rpc.providers';
import * as xrplRest from '$xrp/rest/xrpl.rest';
import { XrpAccountNotFoundError } from '$xrp/rest/xrpl.rest';
import { sendXrp } from '$xrp/services/xrp-send.services';
import * as xrpSignServices from '$xrp/services/xrp-sign.services';
import { XrpNetworks } from '$xrp/types/network';
import { XRP_EXTERNAL_REF_KEYS } from '$xrp/types/xrp-active-tx';
import {
	XrpAmountExceedsSendableError,
	XrpDestinationTagRequiredError,
	XrpDestinationUnfundedError,
	XrpSelfDestinationError,
	XrpSendAlreadyInFlightError,
	XrpSendNotGuardedError
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
		destinationTag: 12345,
		token: XRP_TOKEN
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
		// The in-flight guard reads the caller's records before any node call, and the send opens
		// one between signing and submitting. Nothing open by default, so only the tests that care
		// set a record.
		vi.spyOn(backendApi, 'getActiveUserTransactions').mockResolvedValue([]);
		vi.spyOn(activeUserTransactionsServices, 'createActiveUserTransaction').mockResolvedValue();
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

	// No `CONFIRM`: the send stops at the broadcast, so the last two steps report that finishing
	// rather than the payment landing. Waiting for the ledger here would hold the user for the whole
	// validity window over something the record already tracks.
	it('reports progress through the send steps, without confirming', async () => {
		const progress = vi.fn();

		await sendXrp({ ...params, progress });

		expect(progress.mock.calls.map(([step]) => step)).toEqual([
			ProgressStepsSendXrp.INITIALIZATION,
			ProgressStepsSendXrp.SIGN,
			ProgressStepsSendXrp.SEND,
			ProgressStepsSendXrp.RELOAD,
			ProgressStepsSendXrp.DONE
		]);
		expect(progress.mock.calls.map(([step]) => step)).not.toContain(ProgressStepsSendXrp.CONFIRM);
	});

	// Past the broadcast a progress observer must not be able to change what happened to the blob.
	// Unguarded, a throw at CONFIRM escaped as a plain error with no `pending` attached — which a
	// caller cannot tell from a pre-broadcast failure, so it rebuilds on a new sequence and pays
	// twice — and a throw at DONE reported a validated `tesSUCCESS` as a rejection, where a resend
	// is unambiguously a duplicate.
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

		// The type is the contract, not decoration: the wizard matches on it to show a message that
		// names the correction. A plain `Error` reaches the generic branch and reports a guard that
		// worked exactly as designed as an unexpected failure.
		it('types the over-maximum refusal', async () => {
			sourceWith({ balance: 2_000_000n, ownerCount: 2 });

			await expect(sendXrp({ ...params, amount: 900_000n, fee: 10n })).rejects.toBeInstanceOf(
				XrpAmountExceedsSendableError
			);
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

		it('types the unsettled-destination refusal', async () => {
			destinationIn({ current: 0, validated: undefined });

			await expect(sendXrp({ ...params, amount: belowReserve })).rejects.toBeInstanceOf(
				XrpDestinationUnfundedError
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

		it('types the missing-tag refusal', async () => {
			destinationIn({ current: 0x00020000, validated: 0 });

			await expect(sendXrp({ ...params, destinationTag: undefined })).rejects.toBeInstanceOf(
				XrpDestinationTagRequiredError
			);
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
		const notConfigured = new XrpRpcNotConfiguredError('No XRPL RPC endpoint is configured');

		// The endpoint is a build-time constant, so nothing was broadcast and nothing can have been.
		// It is the one submit failure that is safe to report as definitive.
		it('surfaces as itself', async () => {
			vi.spyOn(xrplRest, 'submitXrpTransaction').mockRejectedValue(notConfigured);

			await expect(sendXrp(params)).rejects.toBe(notConfigured);
		});
	});

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

		// Typed like the other pre-sign refusals: the wizard matches on it to show a message naming
		// the correction and to go back to where the recipient is chosen.
		it('carries its own type', async () => {
			await expect(sendXrp({ ...params, destination: params.source })).rejects.toBeInstanceOf(
				XrpSelfDestinationError
			);
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

	// An XRPL `Sequence` is a nonce, so a second payment from the same address while the first is
	// unresolved is unsafe whichever sequence it picks. The record is what refuses it.
	describe('the in-flight guard', () => {
		const withSource = (source_address: string) =>
			({
				...mockXrpActiveUserTransaction,
				data: { Xrp: { ...mockXrpData, source_address } }
			}) as ActiveUserTransaction;

		it('refuses a send while a non-terminal record for the same address is open', async () => {
			vi.mocked(backendApi.getActiveUserTransactions).mockResolvedValue([withSource(source)]);

			await expect(sendXrp(params)).rejects.toThrow(XrpSendAlreadyInFlightError);
		});

		// Before any node read and before anything is signed, so nothing left the wallet and no RPC
		// budget was spent learning what the record already said.
		it('refuses before reading the account or signing anything', async () => {
			vi.mocked(backendApi.getActiveUserTransactions).mockResolvedValue([withSource(source)]);

			await expect(sendXrp(params)).rejects.toThrow(XrpSendAlreadyInFlightError);

			expect(xrplRest.loadXrpAccountInfo).not.toHaveBeenCalled();
			expect(xrplRest.loadXrpLedgerIndex).not.toHaveBeenCalled();
			expect(xrpSignServices.signXrpTransaction).not.toHaveBeenCalled();
			expect(xrplRest.submitXrpTransaction).not.toHaveBeenCalled();
		});

		// Per address, not per user: a record for a different address says nothing about this one's
		// sequence.
		it('does not refuse on a record for a different address', async () => {
			vi.mocked(backendApi.getActiveUserTransactions).mockResolvedValue([
				withSource('rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe')
			]);

			await expect(sendXrp(params)).resolves.toBeDefined();
		});

		it.each([{ Succeeded: null }, { Failed: null }])(
			'does not refuse on a terminal record (%o)',
			async (status) => {
				vi.mocked(backendApi.getActiveUserTransactions).mockResolvedValue([
					{ ...withSource(source), status }
				]);

				await expect(sendXrp(params)).resolves.toBeDefined();
			}
		);

		it('does not refuse on an open record from another flow', async () => {
			vi.mocked(backendApi.getActiveUserTransactions).mockResolvedValue([
				mockLiquidiumActiveUserTransaction
			]);

			await expect(sendXrp(params)).resolves.toBeDefined();
		});

		// Fails closed in both directions. Without an answer the invariant cannot be held, and the
		// cost of guessing "nothing open" is a duplicate payment.
		it('refuses when the records cannot be read', async () => {
			vi.mocked(backendApi.getActiveUserTransactions).mockRejectedValue(new Error('unreachable'));

			await expect(sendXrp(params)).rejects.toThrow(XrpSendNotGuardedError);

			expect(xrplRest.submitXrpTransaction).not.toHaveBeenCalled();
		});

		it('refuses without an identity, before asking anything', async () => {
			await expect(sendXrp({ ...params, identity: undefined })).rejects.toThrow(
				XrpSendNotGuardedError
			);

			expect(backendApi.getActiveUserTransactions).not.toHaveBeenCalled();
			expect(xrplRest.submitXrpTransaction).not.toHaveBeenCalled();
		});
	});

	describe('the in-flight record', () => {
		// The only correct moment. Later would miss a submit whose response is lost — precisely what
		// the record exists for — and earlier would be a claim about a transaction that does not
		// exist yet.
		it('is created after signing and before submitting', async () => {
			const order: string[] = [];

			vi.mocked(xrpSignServices.signXrpTransaction).mockImplementation(() => {
				order.push('sign');
				return Promise.resolve(signedBlob);
			});
			vi.mocked(activeUserTransactionsServices.createActiveUserTransaction).mockImplementation(
				() => {
					order.push('create');
					return Promise.resolve();
				}
			);
			vi.mocked(xrplRest.submitXrpTransaction).mockImplementation(() => {
				order.push('submit');
				return Promise.resolve({ engineResult: 'tesSUCCESS', accepted: true, txHash: 'TXHASH' });
			});

			await sendXrp(params);

			expect(order).toEqual(['sign', 'create', 'submit']);
		});

		it('carries the locally derived hash and the signed ledger window', async () => {
			const txHash = await deriveXrpTransactionHash(signedBlob);

			await sendXrp(params);

			expect(activeUserTransactionsServices.createActiveUserTransaction).toHaveBeenCalledWith(
				expect.objectContaining({
					identity: mockIdentity,
					data: {
						Xrp: {
							token: { XrpNativeMainnet: null },
							source_address: source,
							destination_address: destination,
							destination_tag: [12345],
							amount: 25_000_000n,
							fee: 12n
						}
					},
					externalRefs: expect.arrayContaining([
						{ key: XRP_EXTERNAL_REF_KEYS.TX_HASH, value: txHash },
						{
							key: XRP_EXTERNAL_REF_KEYS.LAST_LEDGER_SEQUENCE,
							value: `${1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET}`
						}
					])
				})
			);
		});

		// Refused rather than sent unrecorded: at the per-user cap, or with the backend unreachable,
		// there is nothing to hold the invariant and nothing to resolve the payment either.
		it('refuses the send when the record cannot be created, without submitting', async () => {
			vi.mocked(activeUserTransactionsServices.createActiveUserTransaction).mockRejectedValue(
				new Error('TooManyActiveTransactions')
			);

			await expect(sendXrp(params)).rejects.toThrow(XrpSendNotGuardedError);

			expect(xrplRest.submitXrpTransaction).not.toHaveBeenCalled();
		});

		// The record is open by then, so the ledger decides — which is exactly what a lost submit
		// response needs. Reporting an error here would tell the user nothing was sent.
		it.each([
			['a rejected request', new Error('network down')],
			['a malformed response', new Error('Unexpected XRPL submit response')]
		])('resolves the send despite %s, leaving the outcome to the record', async (...[, err]) => {
			vi.spyOn(xrplRest, 'submitXrpTransaction').mockRejectedValue(err);

			await expect(sendXrp(params)).resolves.toMatchObject({
				txHash: await deriveXrpTransactionHash(signedBlob)
			});
		});

		// The send writes the record and never closes it. One confirmation path, not two racing for
		// a status the backend makes immutable.
		it('never writes a terminal status and never confirms', async () => {
			const update = vi.spyOn(activeUserTransactionsServices, 'updateActiveUserTransaction');
			const outcome = vi.spyOn(xrplRest, 'loadXrpTransactionOutcome');

			await sendXrp(params);

			expect(update).not.toHaveBeenCalled();
			expect(outcome).not.toHaveBeenCalled();
		});

		it('returns the locally derived hash rather than the one the node echoed', async () => {
			vi.spyOn(xrplRest, 'submitXrpTransaction').mockResolvedValue({
				engineResult: 'tesSUCCESS',
				accepted: true,
				txHash: 'NOTTHEHASHWEDERIVED'
			});

			const { txHash } = await sendXrp(params);

			expect(txHash).toBe(await deriveXrpTransactionHash(signedBlob));
		});
	});
});
