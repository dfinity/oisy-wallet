import { BTC_MAINNET_TOKEN } from '$env/tokens.btc.env';
import { ETHEREUM_TOKEN, ICP_TOKEN } from '$env/tokens.env';
import type { TokenUi } from '$lib/types/token';
import { defineTokensToDisplay } from '$lib/utils/tokens-ui.utils';
import { expect } from 'vitest';

const sortedTokens: TokenUi[] = [
	{ ...ICP_TOKEN, usdBalance: 300 },
	{ ...BTC_MAINNET_TOKEN, usdBalance: 200 },
	{ ...ETHEREUM_TOKEN, usdBalance: 100 }
];

describe('defineTokensToDisplay', () => {
	it('should return sorted tokens when current list is undefined', () => {
		const result: TokenUi[] = defineTokensToDisplay({
			currentTokens: undefined,
			sortedTokens: sortedTokens,
			$pointerEventStore: false
		});

		expect(result).toEqual(sortedTokens);
	});

	it('should return sorted tokens when there are no pointer events', () => {
		const result: TokenUi[] = defineTokensToDisplay({
			currentTokens: [],
			sortedTokens: sortedTokens,
			$pointerEventStore: false
		});

		expect(result).toEqual(sortedTokens);
	});

	it('should return sorted tokens when order has not changed and there are pointer events', () => {
		const currentTokens: TokenUi[] = defineTokensToDisplay({
			currentTokens: undefined,
			sortedTokens,
			$pointerEventStore: false
		});

		expect(currentTokens).toEqual(sortedTokens);

		const newSortedTokens: TokenUi[] = sortedTokens.map((token) => ({
			...token,
			usdBalance: (token.usdBalance ?? 0) + 100
		}));

		const result: TokenUi[] = defineTokensToDisplay({
			currentTokens,
			sortedTokens: newSortedTokens,
			$pointerEventStore: true
		});

		expect(result).toEqual(newSortedTokens);
	});

	it('should preserve the original order but update balances when order has changed and there are pointer events', () => {
		const currentTokens: TokenUi[] = defineTokensToDisplay({
			currentTokens: undefined,
			sortedTokens,
			$pointerEventStore: false
		});

		expect(currentTokens).toEqual(sortedTokens);

		const newSortedTokens: TokenUi[] = [
			{ ...BTC_MAINNET_TOKEN, usdBalance: 300 },
			{ ...ETHEREUM_TOKEN, usdBalance: 200 },
			{ ...ICP_TOKEN, usdBalance: 100 }
		];

		const result: TokenUi[] = defineTokensToDisplay({
			currentTokens,
			sortedTokens: newSortedTokens,
			$pointerEventStore: true
		});

		expect(result).toEqual([
			{ ...ICP_TOKEN, usdBalance: 100 },
			{ ...BTC_MAINNET_TOKEN, usdBalance: 300 },
			{ ...ETHEREUM_TOKEN, usdBalance: 200 }
		]);
	});
});
