import SendDestinationTabs from '$lib/components/send/SendDestinationTabs.svelte';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { knownDestinations } from '$tests/mocks/transactions.mock';
import { render } from '@testing-library/svelte';

describe('SendDestinationTabs', () => {
	it('renders known destinations tab by default', () => {
		const { getByText } = render(SendDestinationTabs, {
			props: {
				destination: '',
				knownDestinations
			}
		});

		Object.keys(knownDestinations).forEach((address) => {
			expect(getByText(shortenWithMiddleEllipsis({ text: address }))).toBeInTheDocument();
		});
	});

	// TODO: add test for contacts tab when it's implemented
});
