import ScannerInfo from '$lib/components/scanner/ScannerInfo.svelte';
import {
	OISY_SCANNER_INFO,
	OISY_SCANNER_INFO_GOT_IT_BUTTON
} from '$lib/constants/test-ids.constants';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render, screen } from '@testing-library/svelte';

describe('ScannerInfo', () => {
	const mockOnButtonClick = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render the info container with correct test ID', () => {
		const { getByTestId } = render(ScannerInfo, {
			props: { onButtonClick: mockOnButtonClick }
		});

		expect(getByTestId(OISY_SCANNER_INFO)).toBeInTheDocument();
	});

	it('should render the title', () => {
		render(ScannerInfo, {
			props: { onButtonClick: mockOnButtonClick }
		});

		expect(
			screen.getByText(replaceOisyPlaceholders(en.scanner.text.what_is_scan_title))
		).toBeInTheDocument();
	});

	it('should render the description', () => {
		const { container } = render(ScannerInfo, {
			props: { onButtonClick: mockOnButtonClick }
		});

		const description = replaceOisyPlaceholders(en.scanner.text.what_is_scan_description);

		expect(container.innerHTML).toContain(description);
	});

	it('should render the "learn more about scan" link', () => {
		render(ScannerInfo, {
			props: { onButtonClick: mockOnButtonClick }
		});

		const linkText = replaceOisyPlaceholders(en.scanner.text.learn_more_about_scan);

		expect(screen.getByText(linkText)).toBeInTheDocument();
	});

	it('should render the "learn more about pay" link', () => {
		render(ScannerInfo, {
			props: { onButtonClick: mockOnButtonClick }
		});

		const linkText = replaceOisyPlaceholders(en.scanner.text.learn_more_about_pay);

		expect(screen.getByText(linkText)).toBeInTheDocument();
	});

	it('should render the "Got it" button with correct test ID', () => {
		const { getByTestId } = render(ScannerInfo, {
			props: { onButtonClick: mockOnButtonClick }
		});

		expect(getByTestId(OISY_SCANNER_INFO_GOT_IT_BUTTON)).toBeInTheDocument();
	});

	it('should render the "Got it" button with correct text', () => {
		const { getByTestId } = render(ScannerInfo, {
			props: { onButtonClick: mockOnButtonClick }
		});

		const button = getByTestId(OISY_SCANNER_INFO_GOT_IT_BUTTON);

		expect(button).toHaveTextContent(en.core.text.got_it);
	});

	it('should call onButtonClick when "Got it" button is clicked', async () => {
		const { getByTestId } = render(ScannerInfo, {
			props: { onButtonClick: mockOnButtonClick }
		});

		const button = getByTestId(OISY_SCANNER_INFO_GOT_IT_BUTTON);
		await fireEvent.click(button);

		expect(mockOnButtonClick).toHaveBeenCalledOnce();
	});
});
