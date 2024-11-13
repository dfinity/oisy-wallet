import { ETHEREUM_TOKEN, ICP_TOKEN } from '$env/tokens.env';
import { initConvertContext } from '$lib/stores/convert.store';
import { mockPage } from '$tests/mocks/page.store.mock';
import { testDerivedUpdates } from '$tests/utils/derived.utils';
import { expect } from 'vitest';

describe('convertStore', () => {
	beforeEach(() => {
		mockPage.reset();
	});

	it('should ensure derived stores update at most once when the store changes', async () => {
		await testDerivedUpdates(() =>
			initConvertContext({
				destinationToken: ETHEREUM_TOKEN,
				sourceToken: ICP_TOKEN
			})
		);
	});

	it('should have all expected properties', () => {
		const store = initConvertContext({
			destinationToken: ETHEREUM_TOKEN,
			sourceToken: ICP_TOKEN
		});

		expect(store).toHaveProperty('sourceToken');
		expect(store).toHaveProperty('destinationToken');
		expect(store).toHaveProperty('sourceTokenBalance');
		expect(store).toHaveProperty('destinationTokenBalance');
		expect(store).toHaveProperty('sourceTokenExchangeRate');
		expect(store).toHaveProperty('destinationTokenExchangeRate');
	});
});
