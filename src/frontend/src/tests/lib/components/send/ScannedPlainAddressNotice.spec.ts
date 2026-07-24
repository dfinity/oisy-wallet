import ScannedPlainAddressNotice from '$lib/components/send/ScannedPlainAddressNotice.svelte';
import { SEND_SCANNED_PLAIN_ADDRESS_NOTICE } from '$lib/constants/test-ids.constants';
import en from '$lib/i18n/en.json';
import { SCANNED_PLAIN_ADDRESS_SEND_CONTEXT_KEY } from '$lib/stores/scanned-plain-address-send.store';
import { render } from '@testing-library/svelte';

describe('ScannedPlainAddressNotice', () => {
	it('renders nothing when no context is provided', () => {
		const { queryByTestId } = render(ScannedPlainAddressNotice);

		expect(queryByTestId(SEND_SCANNED_PLAIN_ADDRESS_NOTICE)).not.toBeInTheDocument();
	});

	it('renders nothing when the context flag is false', () => {
		const { queryByTestId } = render(ScannedPlainAddressNotice, {
			context: new Map<symbol, unknown>([[SCANNED_PLAIN_ADDRESS_SEND_CONTEXT_KEY, false]])
		});

		expect(queryByTestId(SEND_SCANNED_PLAIN_ADDRESS_NOTICE)).not.toBeInTheDocument();
	});

	it('renders the warning box when the context flag is true', () => {
		const { getByTestId, getByText } = render(ScannedPlainAddressNotice, {
			context: new Map<symbol, unknown>([[SCANNED_PLAIN_ADDRESS_SEND_CONTEXT_KEY, true]])
		});

		expect(getByTestId(SEND_SCANNED_PLAIN_ADDRESS_NOTICE)).toBeInTheDocument();
		expect(getByText(en.send.info.scanned_address_only_destination)).toBeInTheDocument();
	});

	it('renders the single-token variant copy when variant is "single-token"', () => {
		const { getByTestId, getByText, queryByText } = render(ScannedPlainAddressNotice, {
			props: { variant: 'single-token' },
			context: new Map<symbol, unknown>([[SCANNED_PLAIN_ADDRESS_SEND_CONTEXT_KEY, true]])
		});

		expect(getByTestId(SEND_SCANNED_PLAIN_ADDRESS_NOTICE)).toBeInTheDocument();
		expect(
			getByText(en.send.info.scanned_address_only_destination_single_token)
		).toBeInTheDocument();
		expect(queryByText(en.send.info.scanned_address_only_destination)).not.toBeInTheDocument();
	});

	it('renders the multi-token copy when variant is "multi-token"', () => {
		const { getByText, queryByText } = render(ScannedPlainAddressNotice, {
			props: { variant: 'multi-token' },
			context: new Map<symbol, unknown>([[SCANNED_PLAIN_ADDRESS_SEND_CONTEXT_KEY, true]])
		});

		expect(getByText(en.send.info.scanned_address_only_destination)).toBeInTheDocument();
		expect(
			queryByText(en.send.info.scanned_address_only_destination_single_token)
		).not.toBeInTheDocument();
	});

	it('renders the multi-network variant copy when variant is "multi-network"', () => {
		const { getByTestId, getByText, queryByText } = render(ScannedPlainAddressNotice, {
			props: { variant: 'multi-network' },
			context: new Map<symbol, unknown>([[SCANNED_PLAIN_ADDRESS_SEND_CONTEXT_KEY, true]])
		});

		expect(getByTestId(SEND_SCANNED_PLAIN_ADDRESS_NOTICE)).toBeInTheDocument();
		expect(
			getByText(en.send.info.scanned_address_only_destination_multi_network)
		).toBeInTheDocument();
		expect(queryByText(en.send.info.scanned_address_only_destination)).not.toBeInTheDocument();
		expect(
			queryByText(en.send.info.scanned_address_only_destination_single_token)
		).not.toBeInTheDocument();
	});
});
