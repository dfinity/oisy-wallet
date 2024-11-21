import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import * as exchanges from '$lib/derived/exchange.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { initConvertContext } from '$lib/stores/convert.store';
import { mockPage } from '$tests/mocks/page.store.mock';
import { testDerivedUpdates } from '$tests/utils/derived.utils';
import { BigNumber } from 'alchemy-sdk';
import { get, readable } from 'svelte/store';

const ethExchangeValue = 1;
const icpExchangeValue = 2;

describe('convertStore', () => {
	beforeEach(() => {
		mockPage.reset();

		vi.spyOn(exchanges, 'exchanges', 'get').mockImplementation(() =>
			readable({
				[ETHEREUM_TOKEN.id]: { usd: ethExchangeValue },
				[ICP_TOKEN.id]: { usd: icpExchangeValue }
			})
		);
	});

	it('should ensure derived stores update at most once when the store changes', async () => {
		await testDerivedUpdates(() =>
			initConvertContext({
				destinationToken: ETHEREUM_TOKEN,
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
		} = initConvertContext({
			destinationToken: ETHEREUM_TOKEN,
			sourceToken: ICP_TOKEN
		});
		const ethBalance = BigNumber.from(1n);
		const icpBalance = BigNumber.from(2n);

		balancesStore.set({
			tokenId: ETHEREUM_TOKEN.id,
			data: { data: ethBalance, certified: true }
		});
		balancesStore.set({
			tokenId: ICP_TOKEN.id,
			data: { data: icpBalance, certified: true }
		});

		expect(get(sourceToken)).toBe(ICP_TOKEN);
		expect(get(destinationToken)).toBe(ETHEREUM_TOKEN);

		expect(get(sourceTokenBalance)).toStrictEqual(icpBalance);
		expect(get(destinationTokenBalance)).toStrictEqual(ethBalance);

		expect(get(sourceTokenExchangeRate)).toStrictEqual(icpExchangeValue);
		expect(get(destinationTokenExchangeRate)).toStrictEqual(ethExchangeValue);
	});
});
