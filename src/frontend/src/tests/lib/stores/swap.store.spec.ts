import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { IcToken } from '$icp/types/ic-token';
import * as exchanges from '$lib/derived/exchange.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { initSwapContext } from '$lib/stores/swap.store';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { testDerivedUpdates } from '$tests/utils/derived.test-utils';
import { BigNumber } from 'alchemy-sdk';
import { get, readable } from 'svelte/store';

const ckBtcExchangeValue = 1;
const icpExchangeValue = 2;
const ckBtcToken = {
	...mockValidIcCkToken,
	symbol: BTC_MAINNET_TOKEN.twinTokenSymbol
} as IcToken;

describe('swapStore', () => {
	beforeEach(() => {
		mockPage.reset();

		vi.spyOn(exchanges, 'exchanges', 'get').mockImplementation(() =>
			readable({
				[ckBtcToken.id]: { usd: ckBtcExchangeValue },
				[ICP_TOKEN.id]: { usd: icpExchangeValue }
			})
		);
	});

	it('should ensure derived stores update at most once when the store changes', async () => {
		await testDerivedUpdates(() =>
			initSwapContext({
				destinationToken: ckBtcToken,
				sourceToken: ICP_TOKEN
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
			destinationToken: ckBtcToken,
			sourceToken: ICP_TOKEN
		});
		const ckBtcBalance = BigNumber.from(1n);
		const icpBalance = BigNumber.from(2n);

		balancesStore.set({
			tokenId: ckBtcToken.id,
			data: { data: ckBtcBalance, certified: true }
		});
		balancesStore.set({
			tokenId: ICP_TOKEN.id,
			data: { data: icpBalance, certified: true }
		});

		expect(get(sourceToken)).toBe(ICP_TOKEN);
		expect(get(destinationToken)).toBe(ckBtcToken);

		expect(get(sourceTokenBalance)).toStrictEqual(icpBalance);
		expect(get(destinationTokenBalance)).toStrictEqual(ckBtcBalance);

		expect(get(sourceTokenExchangeRate)).toStrictEqual(icpExchangeValue);
		expect(get(destinationTokenExchangeRate)).toStrictEqual(ckBtcExchangeValue);
	});

	it('should set tokens correctly', () => {
		const { sourceToken, destinationToken, setSourceToken, setDestinationToken } = initSwapContext({
			destinationToken: ckBtcToken,
			sourceToken: ICP_TOKEN
		});

		expect(get(sourceToken)).toBe(ICP_TOKEN);
		expect(get(destinationToken)).toBe(ckBtcToken);

		setSourceToken(ckBtcToken);
		setDestinationToken(ICP_TOKEN);

		expect(get(sourceToken)).toBe(ckBtcToken);
		expect(get(destinationToken)).toBe(ICP_TOKEN);
	});

	it('should switch tokens correctly', () => {
		const { sourceToken, destinationToken, switchTokens } = initSwapContext({
			destinationToken: ckBtcToken,
			sourceToken: ICP_TOKEN
		});

		expect(get(sourceToken)).toBe(ICP_TOKEN);
		expect(get(destinationToken)).toBe(ckBtcToken);

		switchTokens();

		expect(get(sourceToken)).toBe(ckBtcToken);
		expect(get(destinationToken)).toBe(ICP_TOKEN);
	});
});
