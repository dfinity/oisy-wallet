import { SWAP_AMOUNTS_CONTEXT_KEY } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockContextMap } from '$tests/utils/context.test-utils';
import {
	mockSwapAmountsContextEntry,
	mockSwapContext,
	mockSwapContextEntry
} from '$tests/utils/swap.context.test-utils';
import { get, type Readable } from 'svelte/store';

describe('swap.context.test-utils', () => {
	describe('mockContextMap', () => {
		it('assembles swap entries into a context Map keyed by context symbol', () => {
			const map = mockContextMap([
				mockSwapContextEntry({ sourceToken: mockValidIcToken }),
				mockSwapAmountsContextEntry()
			]);

			expect(map).toBeInstanceOf(Map);
			expect(map.has(SWAP_CONTEXT_KEY)).toBeTruthy();
			expect(map.has(SWAP_AMOUNTS_CONTEXT_KEY)).toBeTruthy();
		});
	});

	describe('mockSwapContext', () => {
		it('builds a SwapContext seeded with the provided source token', () => {
			const context = mockSwapContext({ sourceToken: mockValidIcToken });

			expect(get(context.sourceToken)).toStrictEqual(mockValidIcToken);
		});
	});

	describe('mockSwapContextEntry', () => {
		it('returns an entry keyed by SWAP_CONTEXT_KEY holding a usable SwapContext', () => {
			const [key, value] = mockSwapContextEntry({ sourceToken: mockValidIcToken });

			expect(key).toBe(SWAP_CONTEXT_KEY);

			const { sourceToken } = value as SwapContext;

			expect(get(sourceToken)).toStrictEqual(mockValidIcToken);
		});
	});

	describe('mockSwapAmountsContextEntry', () => {
		it('returns an entry holding a usable swap amounts store', () => {
			const [key, value] = mockSwapAmountsContextEntry();

			expect(key).toBe(SWAP_AMOUNTS_CONTEXT_KEY);

			const { store } = value as { store: Readable<unknown> };

			expect(get(store)).toBeUndefined();
		});
	});
});
