import SupportHelp from '$lib/components/support/SupportHelp.svelte';
import { OISY_SUPPORT_URL } from '$lib/constants/oisy.constants';
import { SUPPORT_HELP_CARD, SUPPORT_HELP_LINK } from '$lib/constants/test-ids.constants';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('SupportHelp', () => {
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
});
