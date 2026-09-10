import Support from '$lib/components/support/Support.svelte';
import { SUPPORT_HELP_CARD, SUPPORT_ICPSWAP_CARD } from '$lib/constants/test-ids.constants';
import { trackSupport } from '$lib/services/support-analytics.services';
import { render } from '@testing-library/svelte';

vi.mock('$lib/services/support-analytics.services', () => ({
	trackSupport: vi.fn()
}));

describe('Support', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders the two cards, Help & Support first', () => {
		const { getByTestId } = render(Support);

		const help = getByTestId(SUPPORT_HELP_CARD);
		const icpSwap = getByTestId(SUPPORT_ICPSWAP_CARD);

		expect(help).toBeInTheDocument();
		expect(icpSwap).toBeInTheDocument();
		expect(help.compareDocumentPosition(icpSwap) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it('tracks the page open once', () => {
		render(Support);

		expect(trackSupport).toHaveBeenCalledExactlyOnceWith({
			action: 'open',
			resultStatus: 'success'
		});
	});
});
