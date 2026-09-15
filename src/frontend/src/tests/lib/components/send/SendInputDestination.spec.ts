import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import SendInputDestination from '$lib/components/send/SendInputDestination.svelte';
import {
	SEND_FIRST_TIME_DESTINATION_CONFIRM,
	SEND_FIRST_TIME_DESTINATION_WARNING
} from '$lib/constants/test-ids.constants';
import { contactsStore } from '$lib/stores/contacts.store';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import type { Token } from '$lib/types/token';
import { getMockContactsUi, mockContactEthAddressUi } from '$tests/mocks/contacts.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('SendInputDestination', () => {
	const props = {
		destination: mockEthAddress,
		inputPlaceholder: 'test',
		invalidDestination: false
	};

	const mockContext = (sendToken: Token) =>
		new Map<symbol, SendContext>([
			[
				SEND_CONTEXT_KEY,
				initSendContext({
					token: sendToken
				})
			]
		]);

	it('renders provided destination', () => {
		const { getByText } = render(SendInputDestination, {
			props,
			context: mockContext(ETHEREUM_TOKEN)
		});

		expect(getByText(en.core.text.to)).toBeInTheDocument();
	});

	it('renders provided destination if inputted address is uppercased', () => {
		const { getByText } = render(SendInputDestination, {
			props: {
				...props,
				destination: props.destination.toUpperCase()
			},
			context: mockContext(ETHEREUM_TOKEN)
		});

		expect(getByText(en.core.text.to)).toBeInTheDocument();
	});

	it('renders invalid destination error message', () => {
		const { getByText } = render(SendInputDestination, {
			props: {
				...props,
				invalidDestination: true
			},
			context: mockContext(ETHEREUM_TOKEN)
		});

		expect(getByText(en.send.assertion.invalid_destination_address)).toBeInTheDocument();
	});

	it('does not render invalid destination error message if destination length is less than required limit', () => {
		const { queryByText } = render(SendInputDestination, {
			props: {
				...props,
				destination: 'Test',
				invalidDestination: true
			},
			context: mockContext(ETHEREUM_TOKEN)
		});

		expect(queryByText(en.send.assertion.invalid_destination_address)).not.toBeInTheDocument();
	});

	it('renders first time destination warning message even for a saved contact', () => {
		contactsStore.set(
			getMockContactsUi({
				n: 1,
				name: 'Multiple Addresses Contact',
				addresses: [mockContactEthAddressUi]
			})
		);

		const { getByTestId } = render(SendInputDestination, {
			props: {
				...props,
				invalidDestination: false,
				knownDestinations: {}
			},
			context: mockContext(ETHEREUM_TOKEN)
		});

		expect(getByTestId(SEND_FIRST_TIME_DESTINATION_WARNING)).toBeInTheDocument();
	});

	it('does not render first time destination warning message if inserted destination is less than 10 characters', () => {
		const { queryByTestId } = render(SendInputDestination, {
			props: {
				...props,
				destination: '0x1d63841',
				invalidDestination: false,
				knownDestinations: {}
			},
			context: mockContext(ETHEREUM_TOKEN)
		});

		expect(queryByTestId(SEND_FIRST_TIME_DESTINATION_WARNING)).not.toBeInTheDocument();
	});

	it('renders first time destination warning message', () => {
		const { getByTestId } = render(SendInputDestination, {
			props: {
				...props,
				invalidDestination: false,
				knownDestinations: {}
			},
			context: mockContext(ETHEREUM_TOKEN)
		});

		expect(getByTestId(SEND_FIRST_TIME_DESTINATION_WARNING)).toHaveTextContent(
			en.send.info.first_time_destination
		);
	});

	it('does not ask to confirm the first time destination on the address step', () => {
		const { getByTestId, queryByTestId } = render(SendInputDestination, {
			props: {
				...props,
				invalidDestination: false,
				knownDestinations: {}
			},
			context: mockContext(ETHEREUM_TOKEN)
		});

		expect(queryByTestId(SEND_FIRST_TIME_DESTINATION_CONFIRM)).not.toBeInTheDocument();
		expect(getByTestId(SEND_FIRST_TIME_DESTINATION_WARNING)).not.toHaveTextContent(
			en.send.info.first_time_destination_confirm
		);
	});
});
