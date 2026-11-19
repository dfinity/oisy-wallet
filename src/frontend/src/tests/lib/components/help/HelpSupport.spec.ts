import HelpSupport from '$lib/components/help/HelpSupport.svelte';
import { OISY_SUPPORT_URL } from '$lib/constants/oisy.constants';
import { HELP_SUPPORT_CARD, HELP_SUPPORT_LINK } from '$lib/constants/test-ids.constants';
import { trackEvent } from '$lib/services/analytics.services';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

describe('HelpSupport', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders the card with its title and description', () => {
		const { getByTestId, getByText } = render(HelpSupport);

		expect(getByTestId(HELP_SUPPORT_CARD)).toBeInTheDocument();
		expect(getByText(en.help.text.support_title)).toBeInTheDocument();
		expect(
			getByText(replaceOisyPlaceholders(en.help.text.support_description))
		).toBeInTheDocument();
	});

	it('links out to the support URL', () => {
		const { getByTestId } = render(HelpSupport);

		const link = getByTestId(HELP_SUPPORT_LINK);

		expect(link).toBeInTheDocument();
		expect(link.getAttribute('href')).toBe(OISY_SUPPORT_URL);
		expect(link.getAttribute('target')).toBe('_blank');
	});

	it('tracks the contact action when the link is clicked', async () => {
		const { getByTestId } = render(HelpSupport);

		await fireEvent.click(getByTestId(HELP_SUPPORT_LINK));

		expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
			name: 'help',
			metadata: {
				event_context: 'help',
				event_modifier: 'contact',
				source_location: 'help_page',
				result_status: 'success',
				event_subcontext: 'support',
				event_key: 'link',
				event_value: OISY_SUPPORT_URL
			}
		});
	});
});
