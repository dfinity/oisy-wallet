import en from '$lib/i18n/en.json';
import XrpSendRetry from '$xrp/components/send/XrpSendRetry.svelte';
import { fireEvent, render, screen } from '@testing-library/svelte';

describe('XrpSendRetry', () => {
	const props = { onRetry: vi.fn(), onClose: vi.fn() };

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('says the outcome is unknown and that a retry cannot pay twice', () => {
		const { container } = render(XrpSendRetry, { props });

		expect(screen.getByTestId('xrp-send-retry-message')).toHaveTextContent(
			en.send.error.xrp_confirmation_failed
		);
		expect(container).toHaveTextContent(en.send.text.xrp_retry_description);
	});

	it('retries on click', async () => {
		render(XrpSendRetry, { props });

		await fireEvent.click(screen.getByTestId('xrp-send-retry-submit'));

		expect(props.onRetry).toHaveBeenCalledOnce();
		expect(props.onClose).not.toHaveBeenCalled();
	});

	// Walking away is legitimate: the record stays open, so the poller resolves it
	// from the ledger and the address stays guarded either way.
	it('closes on cancel without retrying', async () => {
		render(XrpSendRetry, { props });

		await fireEvent.click(screen.getByTestId('xrp-send-retry-close'));

		expect(props.onClose).toHaveBeenCalledOnce();
		expect(props.onRetry).not.toHaveBeenCalled();
	});

	// Both buttons, not just the retry: closing mid-retry would drop the blob while
	// the resubmission is still in flight.
	it('disables both actions while a retry is running', () => {
		render(XrpSendRetry, { props: { ...props, retrying: true } });

		expect(screen.getByTestId('xrp-send-retry-submit')).toBeDisabled();
		expect(screen.getByTestId('xrp-send-retry-close')).toBeDisabled();
	});

	it('enables both actions when no retry is running', () => {
		render(XrpSendRetry, { props });

		expect(screen.getByTestId('xrp-send-retry-submit')).toBeEnabled();
		expect(screen.getByTestId('xrp-send-retry-close')).toBeEnabled();
	});
});
