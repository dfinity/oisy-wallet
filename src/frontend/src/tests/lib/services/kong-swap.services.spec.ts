import * as kongBackendApi from '$lib/api/kong_backend.api';
import { kongSwapSupportedTokens } from '$lib/services/kong-swap.services';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { kongIcToken, mockKongBackendTokens } from '$tests/mocks/kong_backend.mock';

vi.mock('$lib/api/kong_backend.api', () => ({
	kongTokens: vi.fn()
}));

describe('kong-swap.services', () => {
	describe('kongSwapSupportedTokens', () => {
		beforeEach(() => {
			vi.resetAllMocks();
		});

		it('should return canister IDs of IC chain tokens that are not removed', async () => {
			vi.spyOn(kongBackendApi, 'kongTokens').mockResolvedValue(mockKongBackendTokens);

			const result = await kongSwapSupportedTokens({ identity: mockIdentity });

			expect(result).toEqual(new Set([kongIcToken.canister_id]));
		});

		it('should exclude removed IC tokens', async () => {
			const removedToken = { IC: { ...kongIcToken, is_removed: true } };
			vi.spyOn(kongBackendApi, 'kongTokens').mockResolvedValue([
				removedToken
			] as typeof mockKongBackendTokens);

			const result = await kongSwapSupportedTokens({ identity: mockIdentity });

			expect(result).toEqual(new Set());
		});

		it('should exclude LP tokens', async () => {
			vi.spyOn(kongBackendApi, 'kongTokens').mockResolvedValue([mockKongBackendTokens[1]]);

			const result = await kongSwapSupportedTokens({ identity: mockIdentity });

			expect(result).toEqual(new Set());
		});

		it('should return empty set when no tokens exist', async () => {
			vi.spyOn(kongBackendApi, 'kongTokens').mockResolvedValue([]);

			const result = await kongSwapSupportedTokens({ identity: mockIdentity });

			expect(result).toEqual(new Set());
		});
	});
});
