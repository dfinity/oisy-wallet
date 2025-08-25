import { ICP_TOKEN } from '$env/tokens.env';
import { token } from '$lib/stores/token.store';
import { describe, it } from 'vitest';
import { mockPageStore } from '../../mocks/page.store.mock';
import { testDerivedUpdates } from '../../utils/derived.utils';

mockPageStore();

describe('token store', () => {
	it('should ensure derived stores update at most once when the store changes', async () => {
		await testDerivedUpdates(() => token.set(ICP_TOKEN));
	});
});
