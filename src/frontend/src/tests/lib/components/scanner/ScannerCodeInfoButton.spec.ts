import ScannerCodeInfoButton from '$lib/components/scanner/ScannerCodeInfoButton.svelte';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render, screen } from '@testing-library/svelte';

describe('ScannerCodeInfoButton', () => {
	const mockOnclick = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render the button with correct text', () => {
		render(ScannerCodeInfoButton, { props: { onclick: mockOnclick } });

		expect(
			screen.getByText(replaceOisyPlaceholders(en.scanner.text.what_is_scan))
		).toBeInTheDocument();
	});

	it('should call onclick when clicked', async () => {
		render(ScannerCodeInfoButton, { props: { onclick: mockOnclick } });

		const button = screen.getByRole('button');
		await fireEvent.click(button);

		expect(mockOnclick).toHaveBeenCalledOnce();
	});
});
