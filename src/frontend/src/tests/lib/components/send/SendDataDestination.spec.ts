import SendDataDestination from '$lib/components/send/SendDataDestination.svelte';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('SendDataDestination', () => {
	const props = {
		destination: mockBtcAddress
	};

	it('renders data correctly', () => {
		const { container } = render(SendDataDestination, {
			props
		});

		expect(container).toHaveTextContent(en.send.text.destination);

		expect(container).toHaveTextContent(shortenWithMiddleEllipsis({ text: props.destination }));
	});
});
