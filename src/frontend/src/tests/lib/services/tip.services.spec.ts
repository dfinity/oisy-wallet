import * as icrcLedgerApi from '$icp/api/icrc-ledger.api';
import * as backendApi from '$lib/api/backend.api';
import { BACKEND_CANISTER_ID, ZERO } from '$lib/constants/app.constants';
import { tipSpenderSubaccount } from '$lib/services/tip.crypto';
import {
	buildTipLink,
	cancelTip,
	newTipDraft,
	parseClaimCodeFromFragment,
	reserveTip
} from '$lib/services/tip.services';
import { mockIdentity } from '$tests/mocks/identity.mock';

const HOUR_MS = 60 * 60 * 1000;
const LEDGER_ID = 'mxzaz-hqaaa-aaaar-qaada-cai';
const AMOUNT = 500_000n;
const FEE = 10_000n;

const toHex = (bytes: Uint8Array): string =>
	[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');

describe('tip.services', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	describe('link construction', () => {
		it('keeps the claim code in the fragment, never in the path', () => {
			const draft = { tipId: 'the-id', claimCode: 'the-code' };
			const link = buildTipLink(draft);

			expect(link).toBe(`${window.location.origin}/tip/the-id#c=the-code`);
			// The fragment is the point: browsers do not send it to a server, so the
			// code reaches the recipient without passing through any log.
			expect(link.split('#')[0]).not.toContain('the-code');
		});

		it('reads the code back out of a fragment', () => {
			expect(parseClaimCodeFromFragment('#c=abc')).toBe('abc');
			expect(parseClaimCodeFromFragment('c=abc')).toBe('abc');
			expect(parseClaimCodeFromFragment('#c=abc&other=1')).toBe('abc');
			expect(parseClaimCodeFromFragment('#other=1')).toBeUndefined();
			expect(parseClaimCodeFromFragment('#c=')).toBeUndefined();
			expect(parseClaimCodeFromFragment('')).toBeUndefined();
		});
	});

	describe('reserveTip', () => {
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
				durationMs: 24 * HOUR_MS,
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
			expect(link).toContain(`#c=${draft.claimCode}`);
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
				durationMs: HOUR_MS
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
				durationMs: HOUR_MS
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
});
