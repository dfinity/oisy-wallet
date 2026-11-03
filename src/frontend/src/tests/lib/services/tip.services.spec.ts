import * as icrcLedgerApi from '$icp/api/icrc-ledger.api';
import * as backendApi from '$lib/api/backend.api';
import { BACKEND_CANISTER_ID, ZERO } from '$lib/constants/app.constants';
import { ProgressStepsTip } from '$lib/enums/progress-steps';
import { tipSpenderSubaccount } from '$lib/services/tip.crypto';
import {
	buildTipLink,
	cancelTip,
	newTipDraft,
	parseClaimCodeFromFragment,
	parseTipIdFromFragment,
	reserveTip,
	tipRateLimit
} from '$lib/services/tip.services';
import * as tipVetkeys from '$lib/services/tip.vetkeys';
import * as consoleUtils from '$lib/utils/console.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { DerivedKeyMaterial } from '@dfinity/vetkeys';
import { Principal } from '@icp-sdk/core/principal';

const LEDGER_ID = 'mxzaz-hqaaa-aaaar-qaada-cai';
const AMOUNT = 500_000n;
const FEE = 10_000n;
const EXPIRES_AT_NS = 1_800_000_000_000_000_000n;

const toHex = (bytes: Uint8Array): string =>
	[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');

// A real `DerivedKeyMaterial` from a known HKDF key rather than a cast, so
// whatever is handed it encrypts for real. Mirrors `tip.vetkeys.spec.ts`.
const buildKeyMaterial = async (): Promise<DerivedKeyMaterial> => {
	const raw = new Uint8Array(32).fill(7);
	const key = await globalThis.crypto.subtle.importKey('raw', raw, 'HKDF', false, ['deriveKey']);
	return DerivedKeyMaterial.fromCryptoKey(key);
};

const mockDerivation = () =>
	vi.spyOn(tipVetkeys, 'deriveTipKeyMaterial').mockImplementation(buildKeyMaterial);

const mockEncryption = (ciphertext = new Uint8Array([1, 2, 3])) =>
	vi.spyOn(tipVetkeys, 'encryptClaimCodeWithKey').mockResolvedValue(ciphertext);

describe('tip.services', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	describe('link construction', () => {
		it('keeps both the id and the claim code in the fragment', () => {
			const draft = { tipId: 'the-id', claimCode: 'the-code' };
			const link = buildTipLink(draft);

			expect(link).toBe(`${window.location.origin}/tip#i=the-id&c=the-code`);
		});

		it('leaves nothing identifying in the part of the URL that reaches a server', () => {
			// The fragment is the point. Browsers never put it on the wire, so neither
			// the code nor the id passes through a boundary node, an asset canister,
			// or a `Referer` header — and a crawler fetching the link for a preview
			// sees only `/tip`, which is what lets that path be prerendered with the
			// tip's own share card.
			const link = buildTipLink({ tipId: 'the-id', claimCode: 'the-code' });
			const [beforeFragment] = link.split('#');

			expect(beforeFragment).toBe(`${window.location.origin}/tip`);
			expect(beforeFragment).not.toContain('the-code');
			expect(beforeFragment).not.toContain('the-id');
		});

		it('reads the code back out of a fragment', () => {
			expect(parseClaimCodeFromFragment('#c=abc')).toBe('abc');
			expect(parseClaimCodeFromFragment('c=abc')).toBe('abc');
			expect(parseClaimCodeFromFragment('#c=abc&other=1')).toBe('abc');
			expect(parseClaimCodeFromFragment('#i=xyz&c=abc')).toBe('abc');
			expect(parseClaimCodeFromFragment('#other=1')).toBeUndefined();
			expect(parseClaimCodeFromFragment('#c=')).toBeUndefined();
			expect(parseClaimCodeFromFragment('')).toBeUndefined();
		});

		it('reads the id back out of a fragment', () => {
			expect(parseTipIdFromFragment('#i=xyz')).toBe('xyz');
			expect(parseTipIdFromFragment('#i=xyz&c=abc')).toBe('xyz');
			expect(parseTipIdFromFragment('i=xyz')).toBe('xyz');
			expect(parseTipIdFromFragment('#c=abc')).toBeUndefined();
			expect(parseTipIdFromFragment('#i=')).toBeUndefined();
			expect(parseTipIdFromFragment('')).toBeUndefined();
		});

		it('survives a round trip through the fragment it just built', () => {
			// The two halves are written and read in different files; this is what
			// keeps the key names honest between them.
			const draft = { tipId: 'round-trip-id', claimCode: 'round-trip-code' };
			const fragment = new URL(buildTipLink(draft)).hash;

			expect(parseTipIdFromFragment(fragment)).toBe(draft.tipId);
			expect(parseClaimCodeFromFragment(fragment)).toBe(draft.claimCode);
		});
	});

	describe('when the ledger refuses the approval', () => {
		beforeEach(() => {
			mockDerivation();
			mockEncryption(new Uint8Array([1]));
			vi.spyOn(backendApi, 'setTipSecret').mockResolvedValue(undefined);
		});

		it('records which refusal it was, not just that there was one', async () => {
			// The client library reports every `ApproveError` as the same sentence,
			// "Failed to entitle the spender to transfer the amount", and drops the
			// variant that says why. Reserving is the step that touches the sender's
			// money, so a refusal nobody can tell apart from any other refusal is the
			// worst place in the feature to be blind.
			const errorSpy = vi.spyOn(consoleUtils, 'consoleError').mockImplementation(() => {});

			const refusal = Object.assign(
				new Error('Failed to entitle the spender to transfer the amount'),
				{ errorType: { InsufficientFunds: { balance: 42n } } }
			);
			vi.spyOn(icrcLedgerApi, 'approve').mockRejectedValue(refusal);

			await expect(
				reserveTip({
					identity: mockIdentity,
					draft: newTipDraft(),
					ledgerCanisterId: LEDGER_ID,
					amount: AMOUNT,
					fee: FEE,
					expiresAtNs: EXPIRES_AT_NS
				})
			).rejects.toBe(refusal);

			expect(errorSpy).toHaveBeenCalledOnce();

			const [[, detail]] = errorSpy.mock.calls;

			// The variant name and its payload both matter: the balance is what turns
			// "it was refused" into "there was not enough to pay the fee".
			expect((detail as { reason: string }).reason).toContain('InsufficientFunds');
			expect((detail as { reason: string }).reason).toContain('42');
		});

		it('falls back to the error itself when there is no ledger variant', async () => {
			const errorSpy = vi.spyOn(consoleUtils, 'consoleError').mockImplementation(() => {});

			vi.spyOn(icrcLedgerApi, 'approve').mockRejectedValue(new Error('agent exploded'));

			await expect(
				reserveTip({
					identity: mockIdentity,
					draft: newTipDraft(),
					ledgerCanisterId: LEDGER_ID,
					amount: AMOUNT,
					fee: FEE,
					expiresAtNs: EXPIRES_AT_NS
				})
			).rejects.toThrow('agent exploded');

			const [[, detail]] = errorSpy.mock.calls;

			expect((detail as { reason: string }).reason).toBe('agent exploded');
		});
	});

	describe('tipRateLimit', () => {
		it('reads the ceiling and the window out of the canister error', () => {
			// Being turned away used to look exactly like the call failing, so every
			// screen said "try again" — the one thing that cannot work while the
			// limit is still in force.
			expect(tipRateLimit({ RateLimited: { max_calls: 5, window_ns: 60_000_000_000n } })).toEqual({
				maxCalls: 5,
				windowSeconds: 60n
			});
		});

		it('is undefined for any other failure', () => {
			expect(tipRateLimit({ Uncovered: null })).toBeUndefined();
			expect(tipRateLimit(new Error('agent exploded'))).toBeUndefined();
			expect(tipRateLimit(undefined)).toBeUndefined();
		});
	});

	describe('reserveTip', () => {
		// Reserving also stores an encrypted copy of the claim code, so that the
		// sender can get their own link back. Stubbed in every test here: left
		// real, it reaches for a vetKey over an agent that does not exist, and the
		// best-effort `catch` turns that into a warning on a test that is not about
		// recovery at all.
		beforeEach(() => {
			mockDerivation();
			mockEncryption();
			vi.spyOn(backendApi, 'setTipSecret').mockResolvedValue(undefined);
		});

		it('reports each stage as it starts, so the share screen can name the wait', async () => {
			// Three canister calls, one of which is itself two cross-subnet calls, and
			// the whole thing can run past ten seconds. The share screen used to cover
			// all of it with a single sentence, which says the same thing in the first
			// second and the tenth. These are the stages it narrates.
			//
			// Reported before each call rather than after, so a row is marked running
			// while it runs rather than once it is already done.
			vi.spyOn(icrcLedgerApi, 'approve').mockResolvedValue(1n);
			vi.spyOn(backendApi, 'createTip').mockResolvedValue(undefined);

			const progress = vi.fn();

			await reserveTip({
				identity: mockIdentity,
				draft: newTipDraft(),
				ledgerCanisterId: LEDGER_ID,
				amount: AMOUNT,
				fee: FEE,
				expiresAtNs: EXPIRES_AT_NS,
				progress
			});

			expect(progress.mock.calls.flat()).toEqual([
				ProgressStepsTip.RESERVE,
				ProgressStepsTip.CREATE,
				ProgressStepsTip.SAVE,
				ProgressStepsTip.DONE
			]);
		});

		it('stops reporting where it fails, leaving the stage that broke as the last one', async () => {
			// A refused approve must not advance the stepper past the row it died on:
			// the modal drops back to the form, and a reservation that got no further
			// than the approve should not have claimed to be creating a link.
			vi.spyOn(consoleUtils, 'consoleError').mockImplementation(() => {});
			vi.spyOn(icrcLedgerApi, 'approve').mockRejectedValue(new Error('InsufficientFunds'));

			const progress = vi.fn();

			await expect(
				reserveTip({
					identity: mockIdentity,
					draft: newTipDraft(),
					ledgerCanisterId: LEDGER_ID,
					amount: AMOUNT,
					fee: FEE,
					expiresAtNs: EXPIRES_AT_NS,
					progress
				})
			).rejects.toThrow('InsufficientFunds');

			expect(progress.mock.calls.flat()).toEqual([ProgressStepsTip.RESERVE]);
		});

		it('starts the vetKD derivation before the approve rather than after the create', async () => {
			// Why the first tip of a session took so much longer than every one after
			// it. The derivation is the slowest step in this path — an update call
			// whose reply waits on a threshold derivation — and it used to run last,
			// once two ingress calls had already finished. It consumes nothing they
			// produce, so it now runs underneath them, and only the first tip of a
			// session pays for it at all because `deriveTipKeyMaterial` caches.
			//
			// Asserted as an order rather than as a duration: the ordering is the
			// property, and a timing assertion here would measure the mocks.
			const order: string[] = [];

			vi.spyOn(tipVetkeys, 'deriveTipKeyMaterial').mockImplementation(() => {
				order.push('derive');
				return buildKeyMaterial();
			});
			vi.spyOn(icrcLedgerApi, 'approve').mockImplementation(() => {
				order.push('approve');
				return Promise.resolve(1n);
			});
			vi.spyOn(backendApi, 'createTip').mockImplementation(() => {
				order.push('create');
				return Promise.resolve(undefined);
			});

			await reserveTip({
				identity: mockIdentity,
				draft: newTipDraft(),
				ledgerCanisterId: LEDGER_ID,
				amount: AMOUNT,
				fee: FEE,
				expiresAtNs: EXPIRES_AT_NS
			});

			expect(order).toEqual(['derive', 'approve', 'create']);
		});

		it('reports the refused approval, not a derivation that failed alongside it', async () => {
			// Both are in flight at once now, so both can fail in the same attempt.
			// The sender needs to hear why their money was refused; a derivation that
			// broke at the same time is not that answer, and it must not replace it.
			//
			// This also covers the rejection itself being handled. `reserveTip`
			// returns before anything awaits the derivation on this path, and an
			// unobserved rejection is reported as unhandled — from a test that
			// otherwise passes.
			vi.spyOn(consoleUtils, 'consoleError').mockImplementation(() => {});
			vi.spyOn(tipVetkeys, 'deriveTipKeyMaterial').mockRejectedValue(new Error('InvalidKeyName'));
			vi.spyOn(icrcLedgerApi, 'approve').mockRejectedValue(new Error('InsufficientFunds'));

			await expect(
				reserveTip({
					identity: mockIdentity,
					draft: newTipDraft(),
					ledgerCanisterId: LEDGER_ID,
					amount: AMOUNT,
					fee: FEE,
					expiresAtNs: EXPIRES_AT_NS
				})
			).rejects.toThrow('InsufficientFunds');
		});

		it('approves the amount plus one fee, and records only the amount', async () => {
			const approveSpy = vi.spyOn(icrcLedgerApi, 'approve').mockResolvedValue(1n);
			const createSpy = vi.spyOn(backendApi, 'createTip').mockResolvedValue(undefined);

			const draft = newTipDraft();
			const { link } = await reserveTip({
				identity: mockIdentity,
				draft,
				ledgerCanisterId: LEDGER_ID,
				amount: AMOUNT,
				fee: FEE,
				expiresAtNs: EXPIRES_AT_NS,
				message: 'thanks!'
			});

			const [[approved]] = approveSpy.mock.calls;

			// The ledger charges its fee to the allowance and credits the claimer the
			// amount in full, so a reservation of exactly `amount` could never be
			// claimed. The sender covers both.
			expect(approved.amount).toBe(AMOUNT + FEE);
			expect(approved.ledgerCanisterId).toBe(LEDGER_ID);
			expect(approved.spender.owner.toText()).toBe(BACKEND_CANISTER_ID);
			expect(toHex(approved.spender.subaccount as Uint8Array)).toBe(
				toHex(await tipSpenderSubaccount(draft.tipId))
			);

			const [[recorded]] = createSpy.mock.calls;

			expect(recorded.amount).toBe(AMOUNT);
			expect(recorded.tip_id).toBe(draft.tipId);
			expect(recorded.expires_at_ns).toBe(approved.expiresAt);
			expect(parseClaimCodeFromFragment(new URL(link).hash)).toBe(draft.claimCode);
		});

		it('never sends the claim code to the canister, only its hash', async () => {
			vi.spyOn(icrcLedgerApi, 'approve').mockResolvedValue(1n);
			const createSpy = vi.spyOn(backendApi, 'createTip').mockResolvedValue(undefined);

			const draft = newTipDraft();
			await reserveTip({
				identity: mockIdentity,
				draft,
				ledgerCanisterId: LEDGER_ID,
				amount: AMOUNT,
				fee: FEE,
				expiresAtNs: EXPIRES_AT_NS
			});

			const [[recorded]] = createSpy.mock.calls;

			expect(recorded.claim_code_hash).toHaveLength(32);

			// Serialize with bigints stringified, so the whole payload is searchable.
			const serialized = JSON.stringify(recorded, (_key, value) =>
				typeof value === 'bigint' ? value.toString() : value
			);

			expect(serialized).not.toContain(draft.claimCode);
		});

		it('retrying with the same draft replaces the same allowance', async () => {
			const approveSpy = vi.spyOn(icrcLedgerApi, 'approve').mockResolvedValue(1n);
			vi.spyOn(backendApi, 'createTip')
				.mockRejectedValueOnce(new Error('network'))
				.mockResolvedValueOnce(undefined);

			const draft = newTipDraft();
			const args = {
				identity: mockIdentity,
				draft,
				ledgerCanisterId: LEDGER_ID,
				amount: AMOUNT,
				fee: FEE,
				expiresAtNs: EXPIRES_AT_NS
			};

			await expect(reserveTip(args)).rejects.toThrow('network');
			await expect(reserveTip(args)).resolves.toBeDefined();

			const [[first], [second]] = approveSpy.mock.calls;

			// Same subaccount both times, so the second approve *replaces* the first
			// allowance instead of stranding it. A fresh draft on retry would leave
			// the first reservation encumbering the sender's balance until it lapsed.
			expect(toHex(second.spender.subaccount as Uint8Array)).toBe(
				toHex(first.spender.subaccount as Uint8Array)
			);
			expect(second.amount).toBe(first.amount);
		});

		it('stores the encrypted claim code only once the tip exists', async () => {
			const order: string[] = [];
			vi.spyOn(icrcLedgerApi, 'approve').mockResolvedValue(1n);
			vi.spyOn(backendApi, 'createTip').mockImplementation(() => {
				order.push('create');
				return Promise.resolve(undefined);
			});
			vi.spyOn(backendApi, 'setTipSecret').mockImplementation(() => {
				order.push('secret');
				return Promise.resolve(undefined);
			});

			await reserveTip({
				identity: mockIdentity,
				draft: newTipDraft(),
				ledgerCanisterId: LEDGER_ID,
				amount: AMOUNT,
				fee: FEE,
				expiresAtNs: EXPIRES_AT_NS
			});

			// A secret written first would outlive a create that failed, leaving a
			// recoverable link to a tip that never existed.
			expect(order).toEqual(['create', 'secret']);
		});

		it('reserves successfully even when the recoverable copy cannot be stored', async () => {
			const warnSpy = vi.spyOn(consoleUtils, 'consoleWarn').mockImplementation(() => {});
			vi.spyOn(icrcLedgerApi, 'approve').mockResolvedValue(1n);
			vi.spyOn(backendApi, 'createTip').mockResolvedValue(undefined);
			vi.spyOn(backendApi, 'setTipSecret').mockRejectedValue(new Error('vetkd unavailable'));

			const draft = newTipDraft();

			// The tip is real and its link is about to go on screen. Reporting a
			// failed reservation here would tell the sender their money is free when
			// it is reserved.
			await expect(
				reserveTip({
					identity: mockIdentity,
					draft,
					ledgerCanisterId: LEDGER_ID,
					amount: AMOUNT,
					fee: FEE,
					expiresAtNs: EXPIRES_AT_NS
				})
			).resolves.toEqual(
				expect.objectContaining({ link: expect.stringContaining(draft.claimCode) })
			);

			// Twice now, not once: the write is retried before it gives up, and each
			// attempt says so.
			expect(warnSpy).toHaveBeenCalledTimes(2);
		});

		// An ambiguous create — the canister stored the tip, the response was lost —
		// answers `DuplicateTipId` on the retry. Rethrowing it cost the sender the
		// link: `storeClaimCode` runs after the create, so the tip stayed funded and
		// claimable with no recovery secret, while the screen said the reservation
		// had failed.
		describe('when the create comes back DuplicateTipId', () => {
			// What the canister says it stored. Defaults to the terms the tests
			// reserve with, so a test only has to say how the stored tip *differs*.
			const storedTip = (
				overrides: Partial<Awaited<ReturnType<typeof backendApi.getTipDetails>>> = {}
			) =>
				({
					amount: AMOUNT,
					expires_at_ns: EXPIRES_AT_NS,
					ledger_canister_id: Principal.fromText(LEDGER_ID),
					message: [],
					...overrides
				}) as Awaited<ReturnType<typeof backendApi.getTipDetails>>;

			it('reconciles with the claim code and still returns the link', async () => {
				vi.spyOn(icrcLedgerApi, 'approve').mockResolvedValue(1n);
				vi.spyOn(backendApi, 'createTip').mockRejectedValue({ DuplicateTipId: null });
				const detailsSpy = vi.spyOn(backendApi, 'getTipDetails').mockResolvedValue(storedTip());
				const secretSpy = vi.spyOn(backendApi, 'setTipSecret').mockResolvedValue(undefined);

				const draft = newTipDraft();

				await expect(
					reserveTip({
						identity: mockIdentity,
						draft,
						ledgerCanisterId: LEDGER_ID,
						amount: AMOUNT,
						fee: FEE,
						expiresAtNs: EXPIRES_AT_NS
					})
				).resolves.toEqual({
					link: expect.stringContaining(draft.claimCode),
					secretStored: true
				});

				// The claim code is what proves the stored tip is this draft's, so it
				// has to be the one sent — a bare id lookup would pass for someone
				// else's tip.
				const [[verified]] = detailsSpy.mock.calls;

				expect(verified.tip_id).toBe(draft.tipId);
				expect(verified.claim_code).toBe(draft.claimCode);

				// The whole point: the recovery secret gets written, so the sender can
				// find this link again.
				expect(secretSpy).toHaveBeenCalledOnce();
			});

			// The draft is deliberately kept across retries, but the form stays
			// editable — so a sender can edit the amount, retry, replace the
			// allowance at the new figure, and reach here with the stored tip still
			// holding the old one. Continuing would return a link whose share screen
			// and eventual payout disagree.
			it.each([
				{ term: 'amount', overrides: { amount: AMOUNT + 1n } },
				{ term: 'deadline', overrides: { expires_at_ns: EXPIRES_AT_NS + 1n } },
				{
					term: 'ledger',
					overrides: { ledger_canister_id: Principal.fromText('n5wcd-faaaa-aaaar-qaaea-cai') }
				}
			])('rethrows when the stored $term differs from the retry', async ({ overrides }) => {
				vi.spyOn(icrcLedgerApi, 'approve').mockResolvedValue(1n);
				vi.spyOn(backendApi, 'createTip').mockRejectedValue({ DuplicateTipId: null });
				vi.spyOn(backendApi, 'getTipDetails').mockResolvedValue(storedTip(overrides));
				const secretSpy = vi.spyOn(backendApi, 'setTipSecret').mockResolvedValue(undefined);

				await expect(
					reserveTip({
						identity: mockIdentity,
						draft: newTipDraft(),
						ledgerCanisterId: LEDGER_ID,
						amount: AMOUNT,
						fee: FEE,
						expiresAtNs: EXPIRES_AT_NS
					})
				).rejects.toEqual({ DuplicateTipId: null });

				// No link, and no recovery secret for terms the canister never agreed
				// to — the sender is told the reservation failed instead.
				expect(secretSpy).not.toHaveBeenCalled();
			});

			it('rethrows when the stored tip does not answer to this claim code', async () => {
				vi.spyOn(icrcLedgerApi, 'approve').mockResolvedValue(1n);
				vi.spyOn(backendApi, 'createTip').mockRejectedValue({ DuplicateTipId: null });
				vi.spyOn(backendApi, 'getTipDetails').mockRejectedValue({ NotFound: null });
				const secretSpy = vi.spyOn(backendApi, 'setTipSecret').mockResolvedValue(undefined);

				// A genuine id collision rather than a lost response. Continuing here
				// would hand the sender a link to a tip that is not theirs.
				await expect(
					reserveTip({
						identity: mockIdentity,
						draft: newTipDraft(),
						ledgerCanisterId: LEDGER_ID,
						amount: AMOUNT,
						fee: FEE,
						expiresAtNs: EXPIRES_AT_NS
					})
				).rejects.toEqual({ NotFound: null });

				expect(secretSpy).not.toHaveBeenCalled();
			});

			it('leaves every other create failure alone', async () => {
				vi.spyOn(icrcLedgerApi, 'approve').mockResolvedValue(1n);
				vi.spyOn(backendApi, 'createTip').mockRejectedValue({ Uncovered: null });
				const detailsSpy = vi.spyOn(backendApi, 'getTipDetails');

				await expect(
					reserveTip({
						identity: mockIdentity,
						draft: newTipDraft(),
						ledgerCanisterId: LEDGER_ID,
						amount: AMOUNT,
						fee: FEE,
						expiresAtNs: EXPIRES_AT_NS
					})
				).rejects.toEqual({ Uncovered: null });

				// `Uncovered` means the tip was never stored, so there is nothing to
				// read back and asking would only cost a call.
				expect(detailsSpy).not.toHaveBeenCalled();
			});
		});

		// The approve lands, the create does not, and the sender is left paying for
		// an authorisation backing a tip that will never exist — with no route to it
		// from the UI, because cancelling goes through a tip record.
		describe('when the create is refused outright', () => {
			// The revoke is an approve of zero at the tip's own subaccount, so it is
			// the second `approve` call, not the first.
			const revokeCall = (spy: ReturnType<typeof vi.spyOn>) =>
				spy.mock.calls.length > 1 ? spy.mock.calls[1][0] : undefined;

			// Every one of these is decided before `store_tip`, so the tip does not
			// exist and the allowance is backing nothing. `MessageTooLong` is here
			// because an allowlist missed it once — the guard is a denylist now, so
			// a variant added later cleans up by default rather than silently not.
			it.each([
				{ refusal: 'TooManyTips' },
				{ refusal: 'AmountTooSmall' },
				{ refusal: 'InvalidExpiry' },
				{ refusal: 'InvalidTipId' },
				{ refusal: 'InvalidClaimCodeHash' },
				{ refusal: 'MessageTooLong' },
				{ refusal: 'TransferFailed' },
				{ refusal: 'Uncovered' }
			])('gives the allowance back after $refusal', async ({ refusal }) => {
				const approveSpy = vi.spyOn(icrcLedgerApi, 'approve').mockResolvedValue(1n);
				vi.spyOn(backendApi, 'createTip').mockRejectedValue({ [refusal]: null });

				const draft = newTipDraft();

				await expect(
					reserveTip({
						identity: mockIdentity,
						draft,
						ledgerCanisterId: LEDGER_ID,
						amount: AMOUNT,
						fee: FEE,
						expiresAtNs: EXPIRES_AT_NS
					})
				).rejects.toEqual({ [refusal]: null });

				const revoked = revokeCall(approveSpy);

				expect(revoked?.amount).toBe(ZERO);
				// The same subaccount the reservation used, or it would be revoking
				// somebody else's allowance and leaving this one standing.
				expect(toHex(revoked?.spender.subaccount as Uint8Array)).toBe(
					toHex(await tipSpenderSubaccount(draft.tipId))
				);
			});

			// The dangerous case. A lost response is exactly when the tip may well
			// exist — it is why `DuplicateTipId` is reconciled rather than thrown —
			// so revoking here would strip the allowance from a live, claimable tip
			// and leave the claimer unable to collect.
			it('leaves the allowance alone when the create failed in transport', async () => {
				const approveSpy = vi.spyOn(icrcLedgerApi, 'approve').mockResolvedValue(1n);
				vi.spyOn(backendApi, 'createTip').mockRejectedValue(new Error('agent exploded'));

				await expect(
					reserveTip({
						identity: mockIdentity,
						draft: newTipDraft(),
						ledgerCanisterId: LEDGER_ID,
						amount: AMOUNT,
						fee: FEE,
						expiresAtNs: EXPIRES_AT_NS
					})
				).rejects.toThrow('agent exploded');

				expect(approveSpy).toHaveBeenCalledOnce();
			});

			it.each([
				{ refusal: 'RateLimited', err: { RateLimited: { max_calls: 5, window_ns: 60n } } },
				{ refusal: 'InternalError', err: { InternalError: { msg: 'boom' } } }
			])('leaves the allowance alone after $refusal', async ({ err }) => {
				const approveSpy = vi.spyOn(icrcLedgerApi, 'approve').mockResolvedValue(1n);
				vi.spyOn(backendApi, 'createTip').mockRejectedValue(err);

				// `RateLimited` is transient — the sender retries with the same draft
				// and the allowance is still the right one. `InternalError` says the
				// canister broke, not that it wrote nothing.
				await expect(
					reserveTip({
						identity: mockIdentity,
						draft: newTipDraft(),
						ledgerCanisterId: LEDGER_ID,
						amount: AMOUNT,
						fee: FEE,
						expiresAtNs: EXPIRES_AT_NS
					})
				).rejects.toEqual(err);

				expect(approveSpy).toHaveBeenCalledOnce();
			});

			it('reports the original refusal even when the revoke fails', async () => {
				const warnSpy = vi.spyOn(consoleUtils, 'consoleWarn').mockImplementation(() => {});
				vi.spyOn(icrcLedgerApi, 'approve')
					.mockResolvedValueOnce(1n)
					.mockRejectedValueOnce(new Error('ledger refused the revoke'));
				vi.spyOn(backendApi, 'createTip').mockRejectedValue({ TooManyTips: null });

				// The sender needs to know why their tip failed. Replacing that with a
				// cleanup error would tell them nothing they can act on, and the
				// allowance still lapses on its own.
				await expect(
					reserveTip({
						identity: mockIdentity,
						draft: newTipDraft(),
						ledgerCanisterId: LEDGER_ID,
						amount: AMOUNT,
						fee: FEE,
						expiresAtNs: EXPIRES_AT_NS
					})
				).rejects.toEqual({ TooManyTips: null });

				expect(warnSpy).toHaveBeenCalledOnce();
			});
		});
	});

	describe('cancelTip', () => {
		it('stops the tip being claimable before revoking the allowance', async () => {
			const order: string[] = [];
			vi.spyOn(backendApi, 'cancelTip').mockImplementation(() => {
				order.push('cancel');
				return Promise.resolve();
			});
			vi.spyOn(icrcLedgerApi, 'approve').mockImplementation(() => {
				order.push('revoke');
				return Promise.resolve(1n);
			});

			await cancelTip({
				identity: mockIdentity,
				tipId: 'the-id',
				ledgerCanisterId: LEDGER_ID
			});

			// Revoking first would leave a window where the tip still looks live but
			// cannot pay out — an `Uncovered` failure the recipient cannot explain.
			expect(order).toEqual(['cancel', 'revoke']);
		});

		it('revokes by approving zero at the tip own subaccount', async () => {
			vi.spyOn(backendApi, 'cancelTip').mockResolvedValue(undefined);
			const approveSpy = vi.spyOn(icrcLedgerApi, 'approve').mockResolvedValue(1n);

			await cancelTip({
				identity: mockIdentity,
				tipId: 'the-id',
				ledgerCanisterId: LEDGER_ID
			});

			const [[revoked]] = approveSpy.mock.calls;

			expect(revoked.amount).toBe(ZERO);
			expect(toHex(revoked.spender.subaccount as Uint8Array)).toBe(
				toHex(await tipSpenderSubaccount('the-id'))
			);
		});

		it('reports a cancelled tip whose allowance could not be given back', async () => {
			// Provokes the warning on purpose; the repo fails a test that leaves
			// console output behind.
			vi.spyOn(consoleUtils, 'consoleWarn').mockImplementation(() => {});
			vi.spyOn(backendApi, 'cancelTip').mockResolvedValue(undefined);
			vi.spyOn(icrcLedgerApi, 'approve').mockRejectedValue(new Error('the ledger said no'));

			// Emphatically not a throw. The canister has recorded the cancellation, so
			// the tip is not claimable and `cancel_tip` would refuse a second attempt
			// with `NotCancellable` — reporting this as a failed cancellation told the
			// sender nothing had happened and to retry something that could never
			// succeed.
			await expect(
				cancelTip({ identity: mockIdentity, tipId: 'the-id', ledgerCanisterId: LEDGER_ID })
			).resolves.toEqual({ allowanceRevoked: false });
		});

		it('throws when the tip itself could not be cancelled, without touching the allowance', async () => {
			vi.spyOn(backendApi, 'cancelTip').mockRejectedValue(new Error('NotYourTip'));
			const approveSpy = vi.spyOn(icrcLedgerApi, 'approve').mockResolvedValue(1n);

			await expect(
				cancelTip({ identity: mockIdentity, tipId: 'the-id', ledgerCanisterId: LEDGER_ID })
			).rejects.toThrow('NotYourTip');

			// The tip is still claimable, so its allowance still has something to back.
			expect(approveSpy).not.toHaveBeenCalled();
		});
	});

	describe('the recoverable claim code', () => {
		beforeEach(() => {
			// These tests provoke the warnings on purpose; the repo fails a test that
			// leaves console output behind.
			vi.spyOn(consoleUtils, 'consoleWarn').mockImplementation(() => {});
		});

		it('retries once before giving up, and says it failed', async () => {
			// The failure this closes: a single 503 or a rate limit used to cost the tip
			// its recoverable link permanently, with nothing on screen to say so.
			vi.spyOn(icrcLedgerApi, 'approve').mockResolvedValue(1n);
			vi.spyOn(backendApi, 'createTip').mockResolvedValue(undefined);
			mockDerivation();
			mockEncryption();
			const setSpy = vi
				.spyOn(backendApi, 'setTipSecret')
				.mockRejectedValue(new Error('no_healthy_nodes'));

			const { secretStored } = await reserveTip({
				identity: mockIdentity,
				draft: newTipDraft(),
				ledgerCanisterId: LEDGER_ID,
				amount: AMOUNT,
				fee: FEE,
				expiresAtNs: EXPIRES_AT_NS
			});

			expect(setSpy).toHaveBeenCalledTimes(2);
			expect(secretStored).toBeFalsy();
		});

		it('does not spend a second vetKD derivation on the retry', async () => {
			// The retry is meant to be "only the write". The derivation used to sit
			// inside the retried closure, so a transient 503 on the write re-ran a
			// metered vetKD call 1.5 seconds later — hammering the exact endpoint
			// whose cost is the reason the retry is capped at one.
			vi.spyOn(icrcLedgerApi, 'approve').mockResolvedValue(1n);
			vi.spyOn(backendApi, 'createTip').mockResolvedValue(undefined);

			const deriveSpy = mockDerivation();
			const encryptSpy = mockEncryption();
			const setSpy = vi
				.spyOn(backendApi, 'setTipSecret')
				.mockRejectedValueOnce(new Error('503'))
				.mockResolvedValueOnce(undefined);

			const { secretStored } = await reserveTip({
				identity: mockIdentity,
				draft: newTipDraft(),
				ledgerCanisterId: LEDGER_ID,
				amount: AMOUNT,
				fee: FEE,
				expiresAtNs: EXPIRES_AT_NS
			});

			expect(secretStored).toBeTruthy();
			expect(setSpy).toHaveBeenCalledTimes(2);
			expect(encryptSpy).toHaveBeenCalledOnce();
			// The metered half. `reserveTip` starts it and `storeClaimCode` awaits
			// that same promise, so the retry cannot open a second one.
			expect(deriveSpy).toHaveBeenCalledOnce();
		});

		it('does not retry at all when the derivation itself failed', async () => {
			// Nothing to write, and the write is not what broke. Retrying here would
			// be the second metered call the cap exists to prevent.
			vi.spyOn(icrcLedgerApi, 'approve').mockResolvedValue(1n);
			vi.spyOn(backendApi, 'createTip').mockResolvedValue(undefined);
			vi.spyOn(tipVetkeys, 'deriveTipKeyMaterial').mockRejectedValue(new Error('InvalidKeyName'));

			const setSpy = vi.spyOn(backendApi, 'setTipSecret').mockResolvedValue(undefined);

			const { secretStored } = await reserveTip({
				identity: mockIdentity,
				draft: newTipDraft(),
				ledgerCanisterId: LEDGER_ID,
				amount: AMOUNT,
				fee: FEE,
				expiresAtNs: EXPIRES_AT_NS
			});

			expect(secretStored).toBeFalsy();
			expect(setSpy).not.toHaveBeenCalled();
		});

		it('reports success when the retry lands', async () => {
			vi.spyOn(icrcLedgerApi, 'approve').mockResolvedValue(1n);
			vi.spyOn(backendApi, 'createTip').mockResolvedValue(undefined);
			mockDerivation();
			mockEncryption();
			vi.spyOn(backendApi, 'setTipSecret')
				.mockRejectedValueOnce(new Error('503'))
				.mockResolvedValueOnce(undefined);

			const { secretStored } = await reserveTip({
				identity: mockIdentity,
				draft: newTipDraft(),
				ledgerCanisterId: LEDGER_ID,
				amount: AMOUNT,
				fee: FEE,
				expiresAtNs: EXPIRES_AT_NS
			});

			expect(secretStored).toBeTruthy();
		});

		it('still returns the link when the code cannot be stored', async () => {
			// The tip is real and claimable; only its recoverability is lost. Failing
			// the whole reservation here would be much worse than saying so.
			vi.spyOn(icrcLedgerApi, 'approve').mockResolvedValue(1n);
			vi.spyOn(backendApi, 'createTip').mockResolvedValue(undefined);
			mockDerivation();
			vi.spyOn(tipVetkeys, 'encryptClaimCodeWithKey').mockRejectedValue(
				new Error('OperationError')
			);

			const { link, secretStored } = await reserveTip({
				identity: mockIdentity,
				draft: newTipDraft(),
				ledgerCanisterId: LEDGER_ID,
				amount: AMOUNT,
				fee: FEE,
				expiresAtNs: EXPIRES_AT_NS
			});

			expect(link).toContain('/tip#');
			expect(secretStored).toBeFalsy();
		});
	});
});
