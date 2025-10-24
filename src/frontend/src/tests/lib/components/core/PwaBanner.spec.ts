import PwaBanner from '$lib/components/core/PwaBanner.svelte';
import {
	PWA_INFO_BANNER_CLOSE_BUTTON_TEST_ID,
	PWA_INFO_BANNER_TEST_ID
} from '$lib/constants/test-ids.constants';
import * as deviceUtils from '$lib/utils/device.utils';
import { fireEvent, render } from '@testing-library/svelte';

describe('PwaBanner', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(deviceUtils, 'isPWAStandalone').mockReturnValue(true);
	});

	it('should not show the banner for non-PWA environment', () => {
		vi.spyOn(deviceUtils, 'isPWAStandalone').mockReturnValue(false);

		const { queryByTestId } = render(PwaBanner);

		expect(queryByTestId(PWA_INFO_BANNER_TEST_ID)).toBeNull();
		expect(queryByTestId(PWA_INFO_BANNER_TEST_ID)).not.toBeInTheDocument();
	});

	it('should show the banner for PWA environment', () => {
		const { getByTestId } = render(PwaBanner);

		expect(getByTestId(PWA_INFO_BANNER_TEST_ID)).toBeDefined();
		expect(getByTestId(PWA_INFO_BANNER_TEST_ID)).toBeInTheDocument();
	});

	it('should hide the banner after clicking the close button', async () => {
		const { getByTestId, queryByTestId } = render(PwaBanner);

		expect(getByTestId(PWA_INFO_BANNER_TEST_ID)).toBeDefined();
		expect(getByTestId(PWA_INFO_BANNER_TEST_ID)).toBeInTheDocument();

		expect(getByTestId(PWA_INFO_BANNER_CLOSE_BUTTON_TEST_ID)).toBeInTheDocument();

		await fireEvent.click(getByTestId(PWA_INFO_BANNER_CLOSE_BUTTON_TEST_ID));

		expect(queryByTestId(PWA_INFO_BANNER_TEST_ID)).toBeNull();
		expect(queryByTestId(PWA_INFO_BANNER_TEST_ID)).not.toBeInTheDocument();
	});
});
