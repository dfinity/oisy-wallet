import { balancesStore } from '$lib/stores/balances.store';
import { initSendContext } from '$lib/stores/send.store';
import { tipsStore } from '$lib/stores/tips.store';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { Principal } from '@icp-sdk/core/principal';
import { get } from 'svelte/store';

// `reservedTipAmounts` resolves a tip's ledger through `tokens.derived`, and it is
// a module-level `derived` that captures its inputs on first import. Without this
// mock the reservation resolves to nothing and the assertion below passes whether
// or not the subtraction is there — a false green this test was written with and
// then caught by reinstating the subtraction to check the guard actually bites.
vi.mock(import('$lib/derived/tokens.derived'), async (importOriginal) => {
	const actual = await importOriginal();
	const { mockValidIcToken } = await import('$tests/mocks/ic-tokens.mock');
	const { readable } = await import('svelte/store');

	// Partial: the send context's import chain pulls other exports from this
	// module, so only `tokens` is replaced.
	return { ...actual, tokens: readable([mockValidIcToken]) };
});

/**
 * A regression guard, not a feature test.
 *
 * The send context briefly read a balance with live tip reservations subtracted
 * out. That made the send flow, the swap flow and every MAX control quietly offer
 * less than the account held, misstated the portfolio total as though the money
 * had already left, and could not be enforced anyway — staking, depositing and
 * any other wallet bypass it entirely.
 *
 * The reservation is now shown as a status and capped inside the tip form alone.
 * This asserts the shared store went back to telling the truth.
 */
describe('send context balance', () => {
	const token = mockValidIcToken;

	beforeEach(() => {
		balancesStore.reset(token.id);
		tipsStore.set([]);
	});

	it('reports what the ledger holds, with no tip subtraction', () => {
		const balance = 1_000_000n;

		balancesStore.set({ id: token.id, data: { data: balance, certified: true } });

		tipsStore.set([
			{
				tip_id: 'live',
				ledger_canister_id: Principal.fromText(token.ledgerCanisterId),
				amount: 400_000n,
				expires_at_ns: 1_800_000_000_000_000_000n,
				created_at_ns: 1_700_000_000_000_000_000n,
				status: { Reserved: null },
				message: [],
				claimed_by: [],
				last_claim_failure: []
			}
		]);

		const { sendBalance } = initSendContext({ token });

		expect(get(sendBalance)).toBe(balance);
	});
});
