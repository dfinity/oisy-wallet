import { BTC_MAINNET_TOKEN } from '$env/tokens.btc.env';
import { ETHEREUM_TOKEN, ICP_TOKEN } from '$env/tokens.env';
import { currentTokensKeysStore } from '$lib/stores/tokens-to-display.store';
import type { TokenUi } from '$lib/types/token';
import { defineTokensToDisplay, parseTokenKey } from '$lib/utils/tokens-to-display.utils';
import { get } from 'svelte/store';

const sortedTokens: TokenUi[] = [
	{ ...ICP_TOKEN, usdBalance: 300 },
	{ ...BTC_MAINNET_TOKEN, usdBalance: 200 },
	{ ...ETHEREUM_TOKEN, usdBalance: 100 }
];

describe('defineTokensToDisplay', () => {
	it('should store and return sorted tokens when there are no pointer events', () => {
		const pointerEventStore = false;

		const result = defineTokensToDisplay({
			$sortedTokens: sortedTokens,
			$pointerEventStore: pointerEventStore
		});

		expect(result).toEqual(sortedTokens);

		const sortedTokensKeys: string[] = sortedTokens.map(parseTokenKey);

		expect(get(currentTokensKeysStore)).toEqual(sortedTokensKeys);
	});

	it('should return sorted tokens when order has not changed when there is a pointer events', () => {
		let pointerEventStore = false;

		defineTokensToDisplay({
			$sortedTokens: sortedTokens,
			$pointerEventStore: pointerEventStore
		});

		const newSortedTokens: TokenUi[] = sortedTokens.map((token) => ({
			...token,
			usdBalance: (token.usdBalance ?? 0) + 100
		}));

		pointerEventStore = true;

		const result = defineTokensToDisplay({
			$sortedTokens: newSortedTokens,
			$pointerEventStore: pointerEventStore
		});

		expect(result).toEqual(newSortedTokens);
	});

	it('should preserve the original order but update balances when order has changed and pointer events are enabled', () => {
		let pointerEventStore = false;

		defineTokensToDisplay({
			$sortedTokens: sortedTokens,
			$pointerEventStore: pointerEventStore
		});

		const newSortedTokens: TokenUi[] = [
			{ ...BTC_MAINNET_TOKEN, usdBalance: 300 },
			{ ...ETHEREUM_TOKEN, usdBalance: 200 },
			{ ...ICP_TOKEN, usdBalance: 100 }
		];

		pointerEventStore = true;

		const result = defineTokensToDisplay({
			$sortedTokens: newSortedTokens,
			$pointerEventStore: pointerEventStore
		});

		expect(result).toEqual([
			{ ...ICP_TOKEN, usdBalance: 100 },
			{ ...BTC_MAINNET_TOKEN, usdBalance: 300 },
			{ ...ETHEREUM_TOKEN, usdBalance: 200 }
		]);
	});
});
