import Copy from '$lib/components/ui/Copy.svelte';
import * as clipboardUtils from '$lib/utils/clipboard.utils';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';
import type { MockInstance } from 'vitest';

describe('Copy', () => {
	const testId = 'copy-button';

	const props = {
		value: 'mock-address',
		text: 'Address copied to clipboard.',
		testId
	};

	let spyCopy: MockInstance;

	// [copy icon layer, check icon layer], see IconSwap.
	const iconLayers = (button: HTMLElement) => [...button.querySelectorAll('span[aria-hidden]')];

	const expectConfirmed = ({
		button,
		status,
		confirmed
	}: {
		button: HTMLElement;
		status: HTMLElement;
		confirmed: boolean;
	}) => {
		const [copyLayer, checkLayer] = iconLayers(button);

		expect(copyLayer).toHaveAttribute('aria-hidden', `${confirmed}`);
		expect(checkLayer).toHaveAttribute('aria-hidden', `${!confirmed}`);
		expect(status).toHaveTextContent(confirmed ? props.text : '');
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		spyCopy = vi.spyOn(clipboardUtils, 'copyToClipboard').mockResolvedValue(true);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should grow an inline copy tap area only up and down, so it never covers its neighbours', () => {
		const { getByTestId } = render(Copy, { props: { ...props, inline: true } });

		expect(getByTestId(testId)).toHaveClass('relative', 'hit-area', '[--hit-area-x:0px]');
	});

	it('should label the button with the value', () => {
		const { getByTestId } = render(Copy, { props });

		expect(getByTestId(testId)).toHaveAttribute(
			'aria-label',
			`${en.core.text.copy}: ${props.value}`
		);
	});

	it('should use the given aria label', () => {
		const { getByTestId } = render(Copy, { props: { ...props, ariaLabel: 'Copy the link' } });

		expect(getByTestId(testId)).toHaveAttribute('aria-label', 'Copy the link');
	});

	it('should show the copy icon before copying', () => {
		const { getByTestId, getByRole } = render(Copy, { props });

		expectConfirmed({ button: getByTestId(testId), status: getByRole('status'), confirmed: false });
	});

	it('should copy the value without a toast', async () => {
		const { getByTestId } = render(Copy, { props });

		await fireEvent.click(getByTestId(testId));

		expect(spyCopy).toHaveBeenCalledExactlyOnceWith({
			value: props.value,
			text: props.text,
			withToast: false
		});
	});

	it('should confirm the copy on the button and announce it', async () => {
		const { getByTestId, getByRole } = render(Copy, { props });

		await fireEvent.click(getByTestId(testId));

		await vi.waitFor(() =>
			expectConfirmed({ button: getByTestId(testId), status: getByRole('status'), confirmed: true })
		);
	});

	it('should return to the copy icon after 2000 ms', async () => {
		const { getByTestId, getByRole } = render(Copy, { props });

		await fireEvent.click(getByTestId(testId));

		await vi.waitFor(() => expect(getByRole('status')).toHaveTextContent(props.text));

		await vi.advanceTimersByTimeAsync(2000);

		expectConfirmed({ button: getByTestId(testId), status: getByRole('status'), confirmed: false });
	});

	it('should restart the confirmation when copied again', async () => {
		const { getByTestId, getByRole } = render(Copy, { props });

		await fireEvent.click(getByTestId(testId));
		await vi.waitFor(() => expect(getByRole('status')).toHaveTextContent(props.text));

		await vi.advanceTimersByTimeAsync(1500);

		await fireEvent.click(getByTestId(testId));
		await vi.advanceTimersByTimeAsync(1500);

		expect(spyCopy).toHaveBeenCalledTimes(2);

		expectConfirmed({ button: getByTestId(testId), status: getByRole('status'), confirmed: true });

		await vi.advanceTimersByTimeAsync(500);

		expectConfirmed({ button: getByTestId(testId), status: getByRole('status'), confirmed: false });
	});

	it('should not confirm when the copy fails', async () => {
		spyCopy.mockResolvedValue(false);

		const { getByTestId, getByRole } = render(Copy, { props });

		await fireEvent.click(getByTestId(testId));
		await vi.waitFor(() => expect(spyCopy).toHaveBeenCalledOnce());
		await vi.advanceTimersByTimeAsync(0);

		expectConfirmed({ button: getByTestId(testId), status: getByRole('status'), confirmed: false });
	});

	it('should call onCopy after a successful copy only', async () => {
		const onCopy = vi.fn();

		const { getByTestId } = render(Copy, { props: { ...props, onCopy } });

		spyCopy.mockResolvedValueOnce(false);
		await fireEvent.click(getByTestId(testId));
		await vi.advanceTimersByTimeAsync(0);

		expect(onCopy).not.toHaveBeenCalled();

		await fireEvent.click(getByTestId(testId));

		await vi.waitFor(() => expect(onCopy).toHaveBeenCalledOnce());
	});
});
