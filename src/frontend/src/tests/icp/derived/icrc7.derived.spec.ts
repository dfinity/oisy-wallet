import { icrc7CustomTokens } from '$icp/derived/icrc7.derived';
import { icrc7CustomTokensStore } from '$icp/stores/icrc7-custom-tokens.store';
import type { Icrc7CustomToken } from '$icp/types/icrc7-custom-token';
import { mockValidIcrc7Token } from '$tests/mocks/icrc7-tokens.mock';
import { get } from 'svelte/store';

describe('icrc7.derived', () => {
	const mockIcrc7CustomToken: Icrc7CustomToken = {
		...mockValidIcrc7Token,
		version: undefined,
		enabled: true
	};

	describe('icrc7CustomTokens', () => {
		beforeEach(() => {
			vi.resetAllMocks();

			icrc7CustomTokensStore.resetAll();

			icrc7CustomTokensStore.setAll([{ data: mockIcrc7CustomToken, certified: false }]);
		});

		it('should return all ICRC-7 custom tokens', () => {
			const result = get(icrc7CustomTokens);

			expect(result).toEqual([mockIcrc7CustomToken]);
		});
	});
});
