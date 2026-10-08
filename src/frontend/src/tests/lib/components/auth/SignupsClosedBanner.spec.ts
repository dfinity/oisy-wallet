import * as backendApi from '$lib/api/backend.api';
import SignupsClosedBanner from '$lib/components/auth/SignupsClosedBanner.svelte';
import { SIGNUPS_CLOSED_BANNER_TEST_ID } from '$lib/constants/test-ids.constants';
import { disableConsoleLog } from '$tests/utils/console.test-utils';
import { render, waitFor } from '@testing-library/svelte';

describe('SignupsClosedBanner', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	disableConsoleLog();

	it('should render the banner when signups are closed', async () => {
		vi.spyOn(backendApi, 'newUserSignupsAllowed').mockResolvedValue(false);

		const { queryByTestId } = render(SignupsClosedBanner);

		await waitFor(() => {
			expect(queryByTestId(SIGNUPS_CLOSED_BANNER_TEST_ID)).toBeInTheDocument();
		});
	});

	it('should not render the banner when signups are allowed', async () => {
		vi.spyOn(backendApi, 'newUserSignupsAllowed').mockResolvedValue(true);

		const { queryByTestId } = render(SignupsClosedBanner);

		await waitFor(() =>
			expect(backendApi.newUserSignupsAllowed).toHaveBeenCalledWith(
				expect.objectContaining({ certified: false })
			)
		);

		expect(queryByTestId(SIGNUPS_CLOSED_BANNER_TEST_ID)).not.toBeInTheDocument();
	});

	it('should not render the banner when the query fails', async () => {
		vi.spyOn(backendApi, 'newUserSignupsAllowed').mockRejectedValue(new Error('network'));

		const { queryByTestId } = render(SignupsClosedBanner);

		await waitFor(() => expect(backendApi.newUserSignupsAllowed).toHaveBeenCalled());

		expect(queryByTestId(SIGNUPS_CLOSED_BANNER_TEST_ID)).not.toBeInTheDocument();
	});
});
