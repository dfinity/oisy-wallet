import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import SendDestination from '$lib/components/send/SendDestination.svelte';
import { initSendContext, SEND_CONTEXT_KEY } from '$lib/stores/send.store';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { getMockContactsUi, mockContactEthAddressUi } from '$tests/mocks/contacts.mock';
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

	it('renders the full destination address when no contact is resolved', () => {
		const { getByText, queryByText } = render(SendDestination, {
			props: { destination: mockEthAddress, onSendDestinationStep: vi.fn() },
			context: mockContext
		});

		expect(getByText(mockEthAddress)).toBeInTheDocument();
		expect(
			queryByText(shortenWithMiddleEllipsis({ text: mockEthAddress }))
		).not.toBeInTheDocument();
	});

	it('renders the shortened address alongside the contact name when a contact is selected', () => {
		const [selectedContact] = getMockContactsUi({
			n: 1,
			name: 'Alice',
			addresses: [mockContactEthAddressUi]
		});

		const { getByText, queryByText } = render(SendDestination, {
			props: {
				destination: mockEthAddress,
				selectedContact,
				onSendDestinationStep: vi.fn()
			},
			context: mockContext
		});

		expect(getByText(shortenWithMiddleEllipsis({ text: mockEthAddress }))).toBeInTheDocument();
		expect(queryByText(mockEthAddress)).not.toBeInTheDocument();
	});
});
