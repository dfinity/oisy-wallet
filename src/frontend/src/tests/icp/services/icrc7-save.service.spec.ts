import { saveIcrc7CustomTokenInMemory } from '$icp/services/icrc7-save.services';
import { icrc7CustomTokensStore } from '$icp/stores/icrc7-custom-tokens.store';
import type { Icrc7TokenWithoutId } from '$icp/types/icrc7-token';
import { mockValidIcrc7Token } from '$tests/mocks/icrc7-tokens.mock';
import { get } from 'svelte/store';

describe('icrc7-save.services', () => {
	const { id: _id, ...mockTokenWithoutId } = mockValidIcrc7Token;
	const tokenWithoutId: Icrc7TokenWithoutId = mockTokenWithoutId;

	beforeEach(() => {
		icrc7CustomTokensStore.resetAll();
	});

	describe('saveIcrc7CustomTokenInMemory', () => {
		it('should append a certified, enabled custom token to the in-memory store', () => {
			saveIcrc7CustomTokenInMemory({ token: tokenWithoutId });

			const store = get(icrc7CustomTokensStore);

			expect(store).toHaveLength(1);
			expect(store?.[0].certified).toBeTruthy();
			expect(store?.[0].data).toMatchObject({
				...tokenWithoutId,
				enabled: true
			});
			expect(store?.[0].data.id).toBeDefined();
		});

		it('should honour the enabled override', () => {
			saveIcrc7CustomTokenInMemory({ token: tokenWithoutId, enabled: false });

			const store = get(icrc7CustomTokensStore);

			expect(store?.[0].data.enabled).toBeFalsy();
		});

		it('should reuse the existing entry id when called twice with the same token', () => {
			saveIcrc7CustomTokenInMemory({ token: tokenWithoutId });
			const firstId = get(icrc7CustomTokensStore)?.[0].data.id;

			saveIcrc7CustomTokenInMemory({ token: tokenWithoutId, enabled: false });
			const store = get(icrc7CustomTokensStore);

			expect(store).toHaveLength(1);
			expect(store?.[0].data.id).toBe(firstId);
			expect(store?.[0].data.enabled).toBeFalsy();
		});
	});
});
