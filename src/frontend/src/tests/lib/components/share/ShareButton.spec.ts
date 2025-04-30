import ShareButton from '$lib/components/share/ShareButton.svelte';
import { render } from '@testing-library/svelte';

describe('ShareButton', () => {
	const testId = 'shareButtonId';
	const shareButtonSelector = `button[data-tid=${testId}]`;

	describe('Unavailable share option', () => {
		beforeEach(() => {
			Object.defineProperty(window, 'navigator', {
				value: {
					userAgentData: {
						mobile: false
					}
				},
				configurable: true
			});
		});

		it('should not render element if share is unavailable', () => {
			const { container } = render(ShareButton, { testId });

			const shareButton: HTMLButtonElement | null = container.querySelector(shareButtonSelector);

			expect(shareButton).not.toBeInTheDocument();
		});
	});

	describe('Available share option', () => {
		const mockShare = vi.fn();

		beforeEach(() => {
			Object.defineProperty(window, 'navigator', {
				value: {
					share: mockShare
				},
				configurable: true
			});
		});

		it('should render element if share is available', () => {
			const shareAriaLabel = 'label';
			const { container } = render(ShareButton, { testId, shareAriaLabel });

			const shareButton: HTMLButtonElement | null = container.querySelector(shareButtonSelector);

			expect(shareButton).toBeInTheDocument();
			expect(shareButton?.ariaLabel).toBe(shareAriaLabel);
		});

		it('should share text on button click', () => {
			const shareAriaLabel = 'http://localhost:5137/transactions.com';
			const { container } = render(ShareButton, { testId, shareAriaLabel });

			const shareButton: HTMLButtonElement | null = container.querySelector(shareButtonSelector);

			expect(shareButton).toBeInTheDocument();

			shareButton?.click();

			expect(mockShare).toHaveBeenCalledWith({
				text: shareAriaLabel
			});
		});
	});
});
