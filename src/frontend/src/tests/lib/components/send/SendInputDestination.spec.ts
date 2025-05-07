import SendInputDestination from '$lib/components/send/SendInputDestination.svelte';
import { mockEthAddress } from '$tests/mocks/eth.mocks';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('SendInputDestination', () => {
	const props = {
		destination: mockEthAddress,
		inputPlaceholder: 'test',
		isInvalidDestination: undefined
	};

	it('renders provided destination', () => {
		const { getByText } = render(SendInputDestination, {
			props
		});

		expect(getByText(en.core.text.to)).toBeInTheDocument();
	});

	it('renders invalid destination error message', () => {
		const { getByText } = render(SendInputDestination, {
			props: {
				...props,
				invalidDestination: true
			}
		});

		expect(getByText(en.send.assertion.invalid_destination_address)).toBeInTheDocument();
	});

	it('renders unknown destination warning message', () => {
		const { getByText } = render(SendInputDestination, {
			props: {
				...props,
				invalidDestination: false,
				knownDestinations: {}
			}
		});

		expect(getByText(en.send.info.unknown_destination)).toBeInTheDocument();
	});
});
