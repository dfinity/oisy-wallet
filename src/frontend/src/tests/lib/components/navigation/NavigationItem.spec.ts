import NavigationItem from '$lib/components/navigation/NavigationItem.svelte';
import { trackEvent } from '$lib/services/analytics.services';
import type { TrackEventParams } from '$lib/types/analytics';
import { fireEvent, render } from '@testing-library/svelte';

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

describe('NavigationItem', () => {
	const testId = 'nav-item';

	const event: TrackEventParams = {
		name: 'ui_click',
		metadata: {
			source_location: 'navigation',
			source_sublocation: 'main_menu',
			event_value: 'assets'
		}
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should fire the provided trackEvent on click', async () => {
		const { getByTestId } = render(NavigationItem, {
			props: { href: '/', ariaLabel: 'Assets', testId, trackEvent: event }
		});

		await fireEvent.click(getByTestId(testId));

		expect(trackEvent).toHaveBeenCalledExactlyOnceWith(event);
	});

	it('should not fire trackEvent when the prop is absent', async () => {
		const { getByTestId } = render(NavigationItem, {
			props: { href: '/', ariaLabel: 'Assets', testId }
		});

		await fireEvent.click(getByTestId(testId));

		expect(trackEvent).not.toHaveBeenCalled();
	});
});
