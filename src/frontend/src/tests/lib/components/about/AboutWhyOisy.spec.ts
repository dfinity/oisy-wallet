import AboutWhyOisy from '$lib/components/about/AboutWhyOisy.svelte';
import { TRACK_COUNT_OPEN_WHY_OISY } from '$lib/constants/analytics.contants';
import { ABOUT_WHY_OISY_BUTTON } from '$lib/constants/test-ids.constants';
import * as analytics from '$lib/services/analytics.services';
import * as modal from '$lib/stores/modal.store';
import { fireEvent, render } from '@testing-library/svelte';

describe('AboutWhyOisy', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should open modal and track event on click', async () => {
		const trackEventSpy = vi.spyOn(analytics, 'trackEvent');
		const openModalSpy = vi.spyOn(modal.modalStore, 'openAboutWhyOisy');

		const { getByTestId } = render(AboutWhyOisy, {
			props: { trackEventSource: 'test-source' }
		});

		await fireEvent.click(getByTestId(ABOUT_WHY_OISY_BUTTON));

		expect(openModalSpy).toHaveBeenCalled();
		expect(trackEventSpy).toHaveBeenCalledWith({
			name: TRACK_COUNT_OPEN_WHY_OISY,
			metadata: {
				source: 'test-source'
			}
		});
	});
});
