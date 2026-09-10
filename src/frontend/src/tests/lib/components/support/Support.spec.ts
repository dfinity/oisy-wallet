import Support from '$lib/components/support/Support.svelte';
import { SUPPORT_HELP_CARD } from '$lib/constants/test-ids.constants';
import { render } from '@testing-library/svelte';

describe('Support', () => {
	it('renders the Help & Support card', () => {
		const { getByTestId } = render(Support);

		expect(getByTestId(SUPPORT_HELP_CARD)).toBeInTheDocument();
	});
});
