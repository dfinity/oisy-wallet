import { BACKEND_ONRAMPER_ENABLED } from '$env/rest/onramper.env';
import * as backendApi from '$lib/api/backend.api';
import { loadBackendOnramperEnabled } from '$lib/services/backend-onramper-enabled.services';
import * as consoleUtils from '$lib/utils/console.utils';

describe('backend-onramper-enabled.services', () => {
	describe('loadBackendOnramperEnabled', () => {
		beforeEach(() => {
			vi.clearAllMocks();
			vi.spyOn(consoleUtils, 'consoleError').mockImplementation(() => undefined);
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('returns the value reported by the backend query', async () => {
			const spy = vi.spyOn(backendApi, 'onramperEnabled').mockResolvedValue(true);

			const result = await loadBackendOnramperEnabled();

			expect(result).toBeTruthy();
			expect(spy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					certified: false,
					identity: expect.anything()
				})
			);
		});

		it('returns false when the backend query reports false', async () => {
			vi.spyOn(backendApi, 'onramperEnabled').mockResolvedValue(false);

			const result = await loadBackendOnramperEnabled();

			expect(result).toBeFalsy();
		});

		it('falls back to BACKEND_ONRAMPER_ENABLED when the query rejects', async () => {
			vi.spyOn(backendApi, 'onramperEnabled').mockRejectedValue(new Error('unreachable'));

			const result = await loadBackendOnramperEnabled();

			expect(result).toBe(BACKEND_ONRAMPER_ENABLED);
			expect(consoleUtils.consoleError).toHaveBeenCalledOnce();
		});
	});
});
