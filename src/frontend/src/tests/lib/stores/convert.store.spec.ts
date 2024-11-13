import { ETHEREUM_TOKEN, ICP_TOKEN } from '$env/tokens.env';
import { initConvertStore } from '$lib/stores/convert.store';
import { mockPage } from '$tests/mocks/page.store.mock';
import { testDerivedUpdates } from '$tests/utils/derived.utils';

describe('convertStore', () => {
	beforeEach(() => {
		mockPage.reset();
	});

	it('should ensure derived stores update at most once when the store changes', async () => {
		await testDerivedUpdates(() =>
			initConvertStore({
				destinationToken: ETHEREUM_TOKEN,
				sourceToken: ICP_TOKEN
			})
		);
	});
});
