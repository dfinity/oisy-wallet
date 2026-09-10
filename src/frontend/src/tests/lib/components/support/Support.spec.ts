import Support from '$lib/components/support/Support.svelte';
import { SUPPORT_HELP_CARD } from '$lib/constants/test-ids.constants';
import { trackSupport } from '$lib/services/support-analytics.services';
import { render } from '@testing-library/svelte';

vi.mock('$lib/services/support-analytics.services', () => ({
	trackSupport: vi.fn()
}));

describe('Support', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders the Help & Support card', () => {
		const { getByTestId } = render(Support);

		expect(getByTestId(SUPPORT_HELP_CARD)).toBeInTheDocument();
	});

	it('tracks the page open once', () => {
		render(Support);

		expect(trackSupport).toHaveBeenCalledExactlyOnceWith({
			action: 'open',
			resultStatus: 'success'
		});
	});
});
