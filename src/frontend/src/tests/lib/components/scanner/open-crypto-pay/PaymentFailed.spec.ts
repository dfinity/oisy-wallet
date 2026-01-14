import PaymentFailed from '$lib/components/scanner/open-crypto-pay/PaymentFailed.svelte';
import { PAY_CONTEXT_KEY } from '$lib/stores/open-crypto-pay.store';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { writable } from 'svelte/store';

describe('PaymentFailure', () => {
	const mockOnClose = vi.fn();

	const createMockContext = (errorMessage?: string) => ({
		failedPaymentError: writable(errorMessage)
	});

	const renderWithContext = (errorMessage?: string) => {
		const mockContext = createMockContext(errorMessage);

		return render(PaymentFailed, {
			props: { onClose: mockOnClose },
			context: new Map([[PAY_CONTEXT_KEY, mockContext]])
		});
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Rendering', () => {
		it('should render component', () => {
			const { container } = renderWithContext();

			expect(container).toBeInTheDocument();
		});

		it('should render Try Again button', () => {
			const { getByText } = renderWithContext();

			expect(getByText(en.scanner.text.try_again)).toBeInTheDocument();
		});
	});

	describe('Error message', () => {
		it('should not display error message when undefined', () => {
			const { container } = renderWithContext();

			const messageBox = container.querySelector('.message-box');

			expect(messageBox).not.toBeInTheDocument();
		});

		it('should display error message when provided', () => {
			const errorMessage = 'Payment failed: insufficient funds';
			const { getByText } = renderWithContext(errorMessage);

			expect(getByText(errorMessage)).toBeInTheDocument();
		});

		it('should display different error messages', () => {
			const errors = [
				'Network timeout',
				'Transaction rejected by user',
				'Insufficient gas',
				'Invalid signature'
			];

			errors.forEach((error) => {
				const { getByText } = renderWithContext(error);

				expect(getByText(error)).toBeInTheDocument();
			});
		});
	});
});
