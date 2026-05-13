import { ICRC7_BUILTIN_TOKENS } from '$env/tokens/tokens-icrc7/tokens.icrc7.env';
import { loadDefaultIcrc7Tokens } from '$icp/services/icrc7.services';
import { icrc7DefaultTokensStore } from '$icp/stores/icrc7-default-tokens.store';
import { get } from 'svelte/store';

describe('icrc7.services', () => {
	describe('loadDefaultIcrc7Tokens', () => {
		beforeEach(() => {
			icrc7DefaultTokensStore.reset();
		});

		it('should populate the default-tokens store from the curated env list', () => {
			loadDefaultIcrc7Tokens();

			const tokens = get(icrc7DefaultTokensStore);

			expect(tokens).toHaveLength(ICRC7_BUILTIN_TOKENS.length);

			ICRC7_BUILTIN_TOKENS.forEach((token, index) => {
				expect(tokens).toContainEqual({
					...token,
					id: (tokens ?? [])[index].id
				});
			});
		});

		it('should report success', () => {
			expect(loadDefaultIcrc7Tokens()).toEqual({ success: true });
		});
	});
});
