import { goto } from '$app/navigation';
import EmptyTokenList from '$lib/components/scanner/EmptyTokenList.svelte';
import en from '$lib/i18n/en.json';
import { fireEvent, render, screen } from '@testing-library/svelte';

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

describe('NoSupportedTokens', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render component', () => {
		const { container } = render(EmptyTokenList);

		expect(container.firstChild).toBeInTheDocument();
	});

	it('should display no supported tokens heading', () => {
		render(EmptyTokenList);

		expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
			en.scanner.text.no_supported_tokens
		);
	});

	it('should display supported tokens description', () => {
		render(EmptyTokenList);

		expect(screen.getByText(en.scanner.text.supported_tokens)).toBeInTheDocument();
	});

	it('should render IconOisyMate', () => {
		const { container } = render(EmptyTokenList);

		const icon = container.querySelector('svg');

		expect(icon).toBeInTheDocument();
	});

	it('should display go to assets button', () => {
		render(EmptyTokenList);

		const button = screen.getByRole('button', { name: en.scanner.text.go_to_assets });

		expect(button).toBeInTheDocument();
	});

	it('should navigate to home when button clicked', async () => {
		render(EmptyTokenList);

		const button = screen.getByRole('button', { name: en.scanner.text.go_to_assets });

		await fireEvent.click(button);

		expect(goto).toHaveBeenCalledOnce();
	});

	it('should have secondary-light button style', () => {
		render(EmptyTokenList);

		const button = screen.getByRole('button', { name: en.scanner.text.go_to_assets });

		expect(button).toHaveClass('secondary-light');
	});

	it('should not call goto on component mount', () => {
		render(EmptyTokenList);

		expect(goto).not.toHaveBeenCalled();
	});
});
