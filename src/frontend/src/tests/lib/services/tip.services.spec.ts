import * as icrcLedgerApi from '$icp/api/icrc-ledger.api';
import * as backendApi from '$lib/api/backend.api';
import { BACKEND_CANISTER_ID, ZERO } from '$lib/constants/app.constants';
import { tipSpenderSubaccount } from '$lib/services/tip.crypto';
import {
	buildTipLink,
	cancelTip,
	newTipDraft,
	parseClaimCodeFromFragment,
	parseTipIdFromFragment,
	reserveTip
} from '$lib/services/tip.services';
import * as tipVetkeys from '$lib/services/tip.vetkeys';
import * as consoleUtils from '$lib/utils/console.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';

const LEDGER_ID = 'mxzaz-hqaaa-aaaar-qaada-cai';
const AMOUNT = 500_000n;
const FEE = 10_000n;
const EXPIRES_AT_NS = 1_800_000_000_000_000_000n;

const toHex = (bytes: Uint8Array): string =>
	[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');

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
			vi.spyOn(tipVetkeys, 'encryptClaimCode').mockResolvedValue(new Uint8Array([1]));
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

	describe('reserveTip', () => {
		// Reserving also stores an encrypted copy of the claim code, so that the
		// sender can get their own link back. Stubbed in every test here: left
		// real, it reaches for a vetKey over an agent that does not exist, and the
		// best-effort `catch` turns that into a warning on a test that is not about
		// recovery at all.
		beforeEach(() => {
			vi.spyOn(tipVetkeys, 'encryptClaimCode').mockResolvedValue(new Uint8Array([1, 2, 3]));
			vi.spyOn(backendApi, 'setTipSecret').mockResolvedValue(undefined);
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
			vi.spyOn(tipVetkeys, 'encryptClaimCode').mockResolvedValue(new Uint8Array([1, 2, 3]));
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

		it('reports success when the retry lands', async () => {
			vi.spyOn(icrcLedgerApi, 'approve').mockResolvedValue(1n);
			vi.spyOn(backendApi, 'createTip').mockResolvedValue(undefined);
			vi.spyOn(tipVetkeys, 'encryptClaimCode').mockResolvedValue(new Uint8Array([1, 2, 3]));
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
			vi.spyOn(tipVetkeys, 'encryptClaimCode').mockRejectedValue(new Error('InvalidKeyName'));

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
