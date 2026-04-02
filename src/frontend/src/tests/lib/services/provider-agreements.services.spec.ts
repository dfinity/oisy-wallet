import { updateProviderAgreements } from '$lib/api/backend.api';
import { acceptProviderAgreement } from '$lib/services/provider-agreements.services';
import * as eventsUtils from '$lib/utils/events.utils';
import { emit } from '$lib/utils/events.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { nowInBigIntNanoSeconds } from '@dfinity/utils';

vi.mock('$lib/api/backend.api', () => ({
	updateProviderAgreements: vi.fn()
}));

vi.mock('@dfinity/utils', async () => {
	const mod = await vi.importActual<object>('@dfinity/utils');
	return {
		...mod,
		nowInBigIntNanoSeconds: vi.fn().mockReturnValue(123_456_789n)
	};
});

describe('provider-agreements.services', () => {
	describe('acceptProviderAgreement', () => {
		const mockedNow = 123_456_789n;
		const mockUserVersion = 42n;

		const params = {
			identity: mockIdentity,
			currentUserVersion: mockUserVersion
		};

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(eventsUtils, 'emit');
		});

		it('should throw if identity is null', async () => {
			await expect(acceptProviderAgreement({ ...params, identity: null })).rejects.toThrow();

			expect(updateProviderAgreements).not.toHaveBeenCalled();
			expect(emit).not.toHaveBeenCalled();
		});

		it('should throw if identity is undefined', async () => {
			await expect(acceptProviderAgreement({ ...params, identity: undefined })).rejects.toThrow();

			expect(updateProviderAgreements).not.toHaveBeenCalled();
			expect(emit).not.toHaveBeenCalled();
		});

		it('should call updateProviderAgreements with NearIntents-Swap agreement', async () => {
			await acceptProviderAgreement(params);

			expect(nowInBigIntNanoSeconds).toHaveBeenCalledTimes(2);

			expect(updateProviderAgreements).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				providerAgreements: {
					'NearIntents-Swap': {
						accepted: true,
						lastAcceptedTimestamp: mockedNow,
						lastUpdatedTimestamp: mockedNow,
						textSha256: undefined
					}
				},
				currentUserVersion: mockUserVersion
			});
		});

		it('should emit oisyRefreshUserProfile on success', async () => {
			await acceptProviderAgreement(params);

			expect(emit).toHaveBeenCalledExactlyOnceWith({
				message: 'oisyRefreshUserProfile'
			});
		});

		it('should throw on failure and not emit', async () => {
			const mockError = new Error('Backend failure');

			vi.mocked(updateProviderAgreements).mockRejectedValueOnce(mockError);

			await expect(acceptProviderAgreement(params)).rejects.toThrow('Backend failure');

			expect(emit).not.toHaveBeenCalled();
		});

		it('should pass undefined currentUserVersion when not provided', async () => {
			await acceptProviderAgreement({
				identity: mockIdentity,
				currentUserVersion: undefined
			});

			expect(updateProviderAgreements).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					currentUserVersion: undefined
				})
			);
		});
	});
});
