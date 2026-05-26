import ScannedAddressNotice from '$lib/components/send/ScannedAddressNotice.svelte';
import { SEND_SCANNED_ADDRESS_NOTICE } from '$lib/constants/test-ids.constants';
import en from '$lib/i18n/en.json';
import { SCANNED_ADDRESS_NOTICE_CONTEXT_KEY } from '$lib/stores/scanned-address-notice.store';
import { render } from '@testing-library/svelte';

describe('ScannedAddressNotice', () => {
	it('renders nothing when no context is provided', () => {
		const { queryByTestId } = render(ScannedAddressNotice);

		expect(queryByTestId(SEND_SCANNED_ADDRESS_NOTICE)).not.toBeInTheDocument();
	});

	it('renders nothing when the context flag is false', () => {
		const { queryByTestId } = render(ScannedAddressNotice, {
			context: new Map<symbol, unknown>([[SCANNED_ADDRESS_NOTICE_CONTEXT_KEY, false]])
		});

		expect(queryByTestId(SEND_SCANNED_ADDRESS_NOTICE)).not.toBeInTheDocument();
	});

	it('renders the warning box when the context flag is true', () => {
		const { getByTestId, getByText } = render(ScannedAddressNotice, {
			context: new Map<symbol, unknown>([[SCANNED_ADDRESS_NOTICE_CONTEXT_KEY, true]])
		});

		expect(getByTestId(SEND_SCANNED_ADDRESS_NOTICE)).toBeInTheDocument();
		expect(getByText(en.send.info.scanned_address_only_destination)).toBeInTheDocument();
	});
});
