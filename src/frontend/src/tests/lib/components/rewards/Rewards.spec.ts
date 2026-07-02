import Rewards from '$lib/components/rewards/Rewards.svelte';
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

vi.mock('$app/navigation', () => ({
	afterNavigate: vi.fn(),
	goto: vi.fn()
}));

describe('Rewards', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should track a page_open for the Rewards section on mount', () => {
		render(Rewards);

		expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
			name: PLAUSIBLE_EVENTS.PAGE_OPEN,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.REWARDS,
				event_value: PLAUSIBLE_EVENT_VALUES.REWARDS_PAGE
			}
		});
	});
});
