import ReceiveCopy from '$lib/components/receive/ReceiveCopy.svelte';
import * as clipboardUtils from '$lib/utils/clipboard.utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

describe('ReceiveCopy', () => {
	const testId = 'receive-copy';

	const props = {
		address: 'mock-address',
		copyAriaLabel: 'Address copied',
		testId
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should label the button with the given aria label', () => {
		const { getByTestId } = render(ReceiveCopy, { props });

		expect(getByTestId(testId)).toHaveAttribute('aria-label', props.copyAriaLabel);
	});

	it('should copy the address and confirm it in place instead of with a toast', async () => {
		const spyCopy = vi.spyOn(clipboardUtils, 'copyToClipboard').mockResolvedValue(true);

		const { getByTestId, getByRole } = render(ReceiveCopy, { props });

		await fireEvent.click(getByTestId(testId));

		expect(spyCopy).toHaveBeenCalledExactlyOnceWith({
			value: props.address,
			text: props.copyAriaLabel,
			withToast: false
		});

		await waitFor(() => expect(getByRole('status')).toHaveTextContent(props.copyAriaLabel));
	});

	it('should call onCopy after a successful copy', async () => {
		vi.spyOn(clipboardUtils, 'copyToClipboard').mockResolvedValue(true);
		const onCopy = vi.fn();

		const { getByTestId } = render(ReceiveCopy, { props: { ...props, onCopy } });

		await fireEvent.click(getByTestId(testId));

		await waitFor(() => expect(onCopy).toHaveBeenCalledOnce());
	});

	it('should not call onCopy when the copy fails', async () => {
		const spyCopy = vi.spyOn(clipboardUtils, 'copyToClipboard').mockResolvedValue(false);
		const onCopy = vi.fn();

		const { getByTestId } = render(ReceiveCopy, { props: { ...props, onCopy } });

		await fireEvent.click(getByTestId(testId));

		await waitFor(() => expect(spyCopy).toHaveBeenCalledOnce());

		expect(onCopy).not.toHaveBeenCalled();
	});
});
