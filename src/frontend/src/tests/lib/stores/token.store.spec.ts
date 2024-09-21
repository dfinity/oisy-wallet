import { ICP_TOKEN } from '$env/tokens.env';
import { token } from '$lib/stores/token.store';
import { describe, it } from 'vitest';
import { testDerivedUpdates } from '../../utils/derived.utils';

describe('token store', () => {
	it('should ensure derived stores update at most once when the store changes', () => {
		testDerivedUpdates(() => token.set(ICP_TOKEN));
	});
});
