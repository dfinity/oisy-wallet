import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import SendDestination from '$lib/components/send/SendDestination.svelte';
import { initSendContext, SEND_CONTEXT_KEY } from '$lib/stores/send.store';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { render } from '@testing-library/svelte';

describe('SendDestination', () => {
	const mockContext = new Map([]);
	mockContext.set(
		SEND_CONTEXT_KEY,
		initSendContext({
			token: ETHEREUM_TOKEN
		})
	);

	it('renders provided destination', () => {
		const { getByText } = render(SendDestination, {
			props: { destination: mockEthAddress },
			context: mockContext
		});

		expect(getByText(shortenWithMiddleEllipsis({ text: mockEthAddress }))).toBeInTheDocument();
	});
});
