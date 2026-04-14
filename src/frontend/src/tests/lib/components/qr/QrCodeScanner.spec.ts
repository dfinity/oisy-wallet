import QrCodeScanner from '$lib/components/qr/QrCodeScanner.svelte';
import { ADDRESS_BOOK_QR_CODE_SCAN } from '$lib/constants/test-ids.constants';
import en from '$tests/mocks/i18n.mock';
import { render, screen, waitFor } from '@testing-library/svelte';

describe('QrCodeScanner', () => {
	const mockOnScan = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		Object.defineProperty(navigator, 'mediaDevices', {
			value: {
				getUserMedia: vi.fn().mockResolvedValue({
					getTracks: () => []
				})
			},
			writable: true,
			configurable: true
		});
	});

	it('should render the wrapper with correct test ID', () => {
		const { getByTestId } = render(QrCodeScanner, {
			props: { onScan: mockOnScan }
		});

		expect(getByTestId(ADDRESS_BOOK_QR_CODE_SCAN)).toBeInTheDocument();
	});

	it('should apply default height classes when expandedLayout is false', () => {
		const { getByTestId } = render(QrCodeScanner, {
			props: { onScan: mockOnScan, expandedLayout: false }
		});

		const wrapper = getByTestId(ADDRESS_BOOK_QR_CODE_SCAN);

		expect(wrapper.classList.contains('h-[60vh]')).toBeTruthy();
		expect(wrapper.classList.contains('min-h-[300px]')).toBeTruthy();
	});

	it('should apply expanded height classes when expandedLayout is true', () => {
		const { getByTestId } = render(QrCodeScanner, {
			props: { onScan: mockOnScan, expandedLayout: true }
		});

		const wrapper = getByTestId(ADDRESS_BOOK_QR_CODE_SCAN);

		expect(wrapper.classList.contains('h-[calc(100vh-128px)]')).toBeTruthy();
	});

	it('should show camera permission denied message on NotAllowedError', async () => {
		Object.defineProperty(navigator, 'mediaDevices', {
			value: {
				getUserMedia: vi
					.fn()
					.mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'))
			},
			writable: true,
			configurable: true
		});

		render(QrCodeScanner, {
			props: { onScan: mockOnScan }
		});

		await waitFor(() => {
			expect(screen.getByText(en.scanner.text.no_camera_permission)).toBeInTheDocument();
		});
	});
});
