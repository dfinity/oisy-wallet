import Help from '$lib/components/help/Help.svelte';
import { APP_VERSION } from '$lib/constants/app.constants';
import { OISY_NAME } from '$lib/constants/oisy.constants';
import { HELP_ICPSWAP_CARD, HELP_SUPPORT_CARD } from '$lib/constants/test-ids.constants';
import { trackHelp } from '$lib/services/help-analytics.services';
import { render } from '@testing-library/svelte';

vi.mock('$lib/services/help-analytics.services', () => ({
	trackHelp: vi.fn()
}));

describe('Help', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders the two cards, Support first', () => {
		const { getByTestId } = render(Help);

		const support = getByTestId(HELP_SUPPORT_CARD);
		const icpSwap = getByTestId(HELP_ICPSWAP_CARD);

		expect(support).toBeInTheDocument();
		expect(icpSwap).toBeInTheDocument();
		expect(
			support.compareDocumentPosition(icpSwap) & Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
	});

	it('separates the cards instead of letting them touch', () => {
		const { getByTestId } = render(Help);

		// SettingsCard's own `first-of-type:mt-0` cannot see siblings through the test-id
		// wrappers, so the container supplies the spacing.
		const container = getByTestId(HELP_SUPPORT_CARD).parentElement;

		expect(container?.className).toContain('gap-5');
	});

	it('closes the page with the version block, spaced like the Settings page', () => {
		const { getByText, container } = render(Help);

		// SettingsVersion renders the app name next to a link to its release tag.
		expect(getByText(OISY_NAME)).toBeInTheDocument();
		expect(getByText(`v${APP_VERSION}`)).toBeInTheDocument();

		// The mt-24 wrapper is a sibling of the card stack, not a child: inside the flex
		// container its margin would stack on top of the gap.
		const version = getByText(OISY_NAME).closest('.mt-24');

		expect(version).toBeInTheDocument();
		expect(version?.parentElement).toBe(
			container.querySelector('.flex.flex-col.gap-5')?.parentElement
		);
	});

	it('tracks the page open once', () => {
		render(Help);

		expect(trackHelp).toHaveBeenCalledExactlyOnceWith({
			action: 'open',
			resultStatus: 'success'
		});
	});
});
