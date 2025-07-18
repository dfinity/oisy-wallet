import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { IcToken } from '$icp/types/ic-token';
import * as exchanges from '$lib/derived/exchange.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { initSwapContext } from '$lib/stores/swap.store';
import { bn1Bi, bn2Bi } from '$tests/mocks/balances.mock';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { testDerivedUpdates } from '$tests/utils/derived.test-utils';
import { get, readable } from 'svelte/store';

const ckBtcExchangeValue = 1;
const icpExchangeValue = 2;
const ckBtcToken = {
	...mockValidIcCkToken,
	symbol: BTC_MAINNET_TOKEN.twinTokenSymbol
} as IcToken;

describe('swapStore', () => {
	const mockToken1 = { ...ckBtcToken, enabled: true };
	const mockToken2 = { ...ICP_TOKEN, enabled: false };

	beforeEach(() => {
		mockPage.reset();

		vi.spyOn(exchanges, 'exchanges', 'get').mockImplementation(() =>
			readable({
				[mockToken1.id]: { usd: ckBtcExchangeValue },
				[mockToken2.id]: { usd: icpExchangeValue }
			})
		);
	});

	it('should ensure derived stores update at most once when the store changes', async () => {
		await testDerivedUpdates(() =>
			initSwapContext({
				destinationToken: mockToken1,
				sourceToken: mockToken2
			})
		);
	});

	it('should have all expected values', () => {
		const {
			sourceToken,
			sourceTokenBalance,
			sourceTokenExchangeRate,
			destinationTokenExchangeRate,
			destinationTokenBalance,
			destinationToken
		} = initSwapContext({
			destinationToken: mockToken1,
			sourceToken: mockToken2
		});
		const ckBtcBalance = bn1Bi;
		const icpBalance = bn2Bi;

		balancesStore.set({
			id: mockToken1.id,
			data: { data: ckBtcBalance, certified: true }
		});
		balancesStore.set({
			id: mockToken2.id,
			data: { data: icpBalance, certified: true }
		});

		expect(get(sourceToken)).toBe(mockToken2);
		expect(get(destinationToken)).toBe(mockToken1);

		expect(get(sourceTokenBalance)).toStrictEqual(icpBalance);
		expect(get(destinationTokenBalance)).toStrictEqual(ckBtcBalance);

		expect(get(sourceTokenExchangeRate)).toStrictEqual(icpExchangeValue);
		expect(get(destinationTokenExchangeRate)).toStrictEqual(ckBtcExchangeValue);
	});

	it('should set tokens correctly', () => {
		const { sourceToken, destinationToken, setSourceToken, setDestinationToken } = initSwapContext({
			destinationToken: mockToken1,
			sourceToken: mockToken2
		});

		expect(get(sourceToken)).toBe(mockToken2);
		expect(get(destinationToken)).toBe(mockToken1);

		setSourceToken(mockToken1);
		setDestinationToken(mockToken2);

		expect(get(sourceToken)).toBe(mockToken1);
		expect(get(destinationToken)).toBe(mockToken2);
	});

	it('should switch tokens correctly', () => {
		const { sourceToken, destinationToken, switchTokens } = initSwapContext({
			destinationToken: mockToken1,
			sourceToken: mockToken2
		});

		expect(get(sourceToken)).toBe(mockToken2);
		expect(get(destinationToken)).toBe(mockToken1);

		switchTokens();

		expect(get(sourceToken)).toBe(mockToken1);
		expect(get(destinationToken)).toBe(mockToken2);
	});
});
