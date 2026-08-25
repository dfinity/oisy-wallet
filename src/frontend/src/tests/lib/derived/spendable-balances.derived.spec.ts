import { ZERO } from '$lib/constants/app.constants';
import { spendableBalances } from '$lib/derived/spendable-balances.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { get, type Writable } from 'svelte/store';

// Mocked rather than spied on: `spendableBalances` is a module-level `derived`,
// so it captures its input stores the first time this module is imported.
vi.mock('$lib/derived/tips.derived', async () => {
	const { writable } = await import('svelte/store');

	return { reservedTipAmounts: writable<Record<TokenId, bigint>>({}) };
});

describe('spendableBalances', () => {
	const tokenId = mockValidIcToken.id;
	const otherTokenId: TokenId = parseTokenId('other-token');

	let reserved: Writable<Record<TokenId, bigint>>;

	beforeAll(async () => {
		({ reservedTipAmounts: reserved } = (await import('$lib/derived/tips.derived')) as unknown as {
			reservedTipAmounts: Writable<Record<TokenId, bigint>>;
		});
	});

	beforeEach(() => {
		reserved.set({});
		balancesStore.reset(tokenId);
		balancesStore.reset(otherTokenId);
	});

	it('takes the reservation out of the spendable balance', () => {
		balancesStore.set({ id: tokenId, data: { data: 1_000_000n, certified: true } });
		reserved.set({ [tokenId]: 400_000n } as Record<TokenId, bigint>);

		expect(get(spendableBalances)?.[tokenId]?.data).toBe(600_000n);
	});

	it('floors at zero rather than going negative', () => {
		// The same account can be spent from another wallet entirely, so a balance
		// can legitimately sit below its own reservation. "Nothing to spend" is the
		// truth there; a negative number is not.
		balancesStore.set({ id: tokenId, data: { data: 100_000n, certified: true } });
		reserved.set({ [tokenId]: 400_000n } as Record<TokenId, bigint>);

		expect(get(spendableBalances)?.[tokenId]?.data).toBe(ZERO);
	});

	it('leaves balances alone when nothing is reserved', () => {
		balancesStore.set({ id: tokenId, data: { data: 1_000_000n, certified: true } });

		expect(get(spendableBalances)?.[tokenId]?.data).toBe(1_000_000n);
	});

	it('touches only the token that has a reservation', () => {
		balancesStore.set({ id: tokenId, data: { data: 1_000_000n, certified: true } });
		balancesStore.set({ id: otherTokenId, data: { data: 700_000n, certified: true } });
		reserved.set({ [tokenId]: 400_000n } as Record<TokenId, bigint>);

		expect(get(spendableBalances)?.[tokenId]?.data).toBe(600_000n);
		expect(get(spendableBalances)?.[otherTokenId]?.data).toBe(700_000n);
	});
});
