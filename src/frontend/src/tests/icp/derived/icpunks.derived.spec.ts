import { icPunksCustomTokens } from '$icp/derived/icpunks.derived';
import { icPunksCustomTokensStore } from '$icp/stores/icpunks-custom-tokens.store';
import type { IcPunksCustomToken } from '$icp/types/icpunks-custom-token';
import { mockValidIcPunksToken } from '$tests/mocks/icpunks-tokens.mock';
import { get } from 'svelte/store';

describe('icpunks.derived', () => {
	const mockIcPunksCustomToken1: IcPunksCustomToken = {
		...mockValidIcPunksToken,
		version: undefined,
		enabled: true
	};

	describe('icPunksCustomTokens', () => {
		beforeEach(() => {
			vi.resetAllMocks();

			icPunksCustomTokensStore.resetAll();

			icPunksCustomTokensStore.setAll([{ data: mockIcPunksCustomToken1, certified: false }]);
		});

		it('should return all ICPunks custom tokens', () => {
			const result = get(icPunksCustomTokens);

			expect(result).toEqual([mockIcPunksCustomToken1]);
		});
	});
});
