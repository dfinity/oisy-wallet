import { enabledExtTokens, extCustomTokens } from '$icp/derived/ext.derived';
import { extCustomTokens } from '$icp/derived/ext.derived';
import { extCustomTokensStore } from '$icp/stores/ext-custom-tokens.store';
import type { ExtCustomToken } from '$icp/types/ext-custom-token';
import { mockValidExtV2Token, mockValidExtV2Token2 } from '$tests/mocks/ext-tokens.mock';
import { get } from 'svelte/store';

describe('ext.derived', () => {
	const mockExtCustomToken1: ExtCustomToken = {
		...mockValidExtV2Token,
		version: undefined,
		enabled: true
	};

	const mockExtCustomToken2: ExtCustomToken = {
		...mockValidExtV2Token2,
		version: undefined,
		enabled: true
	};

	describe('extCustomTokens', () => {
		beforeEach(() => {
			vi.resetAllMocks();

			extCustomTokensStore.resetAll();

			extCustomTokensStore.setAll([
				{ data: mockExtCustomToken1, certified: false },
				{ data: mockExtCustomToken2, certified: false }
			]);
		});

		it('should return all EXT custom tokens', () => {
			const result = get(extCustomTokens);

			expect(result).toEqual([mockExtCustomToken1, mockExtCustomToken2]);
		});
	});

	describe('enabledExtTokens', () => {
		beforeEach(() => {
			vi.resetAllMocks();

			extCustomTokensStore.resetAll();

			extCustomTokensStore.setAll([
				{ data: mockExtCustomToken1, certified: false },
				{ data: { ...mockExtCustomToken2, enabled: false }, certified: false }
			]);
		});

		it('should return only enabled tokens', () => {
			const result = get(enabledExtTokens);

			expect(result).toEqual([mockExtCustomToken1]);
		});
	});
});
