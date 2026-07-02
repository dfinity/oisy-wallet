import DappsExplorer from '$lib/components/dapps/DappsExplorer.svelte';
import {
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_VALUES,
	PLAUSIBLE_EVENTS
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import { render } from '@testing-library/svelte';

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

describe('DappsExplorer', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should track a page_open for the Explore section on mount', () => {
		render(DappsExplorer);

		expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
			name: PLAUSIBLE_EVENTS.PAGE_OPEN,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.EXPLORE,
				event_value: PLAUSIBLE_EVENT_VALUES.EXPLORE_PAGE
			}
		});
	});
});
