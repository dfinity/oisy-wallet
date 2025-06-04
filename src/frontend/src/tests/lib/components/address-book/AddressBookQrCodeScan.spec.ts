import AddressBookQrCodeScan from '$lib/components/address-book/AddressBookQrCodeScan.svelte';
import {
	ADDRESS_BOOK_CANCEL_BUTTON,
	ADDRESS_BOOK_QR_CODE_SCAN
} from '$lib/constants/test-ids.constants';
import { render } from '@testing-library/svelte';

describe('AddressBookQrCodeScan', () => {
	const qrCodeContainerSelector = `div[data-tid="${ADDRESS_BOOK_QR_CODE_SCAN}"]`;
	const cancelButtonSelector = `button[data-tid="${ADDRESS_BOOK_CANCEL_BUTTON}"]`;

	beforeEach(() => {
		vi.clearAllMocks();

		vi.mock('@dfinity/gix-components', () => ({
			QRCodeReader: vi.fn().mockImplementation(() => ({
				$$render: () => '<div data-tid="mock-qr-reader">Mocked QR Reader</div>',
				$$slots: {},
				$$scope: {}
			}))
		}));
	});

	it('should initialize and start scanning on mount', () => {
		const { container } = render(AddressBookQrCodeScan, {
			props: {
				onClose: vi.fn(),
				address: undefined
			}
		});

		const qrCodeContainer: HTMLDivElement | null = container.querySelector(qrCodeContainerSelector);

		expect(qrCodeContainer).toBeInTheDocument();
	});

	it('should trigger onClose when cancel button is clicked', () => {
		const onClose = vi.fn();
		const { container } = render(AddressBookQrCodeScan, {
			props: {
				onClose,
				address: undefined
			}
		});

		const cancelButton: HTMLButtonElement | null = container.querySelector(cancelButtonSelector);

		expect(cancelButton).toBeInTheDocument();

		cancelButton?.click();

		expect(onClose).toHaveBeenCalled();
	});
});
