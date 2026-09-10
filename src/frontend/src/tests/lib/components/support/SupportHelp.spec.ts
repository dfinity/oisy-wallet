import SupportHelp from '$lib/components/support/SupportHelp.svelte';
import { OISY_SUPPORT_URL } from '$lib/constants/oisy.constants';
import { SUPPORT_HELP_CARD, SUPPORT_HELP_LINK } from '$lib/constants/test-ids.constants';
import { trackEvent } from '$lib/services/analytics.services';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

describe('SupportHelp', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders the card with its title and description', () => {
		const { getByTestId, getByText } = render(SupportHelp);

		expect(getByTestId(SUPPORT_HELP_CARD)).toBeInTheDocument();
		expect(getByText(en.support.text.help_title)).toBeInTheDocument();
		expect(
			getByText(replaceOisyPlaceholders(en.support.text.help_description))
		).toBeInTheDocument();
	});

	it('links out to the support URL', () => {
		const { getByTestId } = render(SupportHelp);

		const link = getByTestId(SUPPORT_HELP_LINK);

		expect(link).toBeInTheDocument();
		expect(link.getAttribute('href')).toBe(OISY_SUPPORT_URL);
		expect(link.getAttribute('target')).toBe('_blank');
	});

	it('tracks the contact action when the link is clicked', async () => {
		const { getByTestId } = render(SupportHelp);

		await fireEvent.click(getByTestId(SUPPORT_HELP_LINK));

		expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
			name: 'support',
			metadata: {
				event_context: 'support',
				event_modifier: 'contact',
				source_location: 'support_page',
				result_status: 'success',
				event_subcontext: 'help',
				event_key: 'link',
				event_value: OISY_SUPPORT_URL
			}
		});
	});
});
