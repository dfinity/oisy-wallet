import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import XrpSendDestinationTag from '$xrp/components/send/XrpSendDestinationTag.svelte';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('XrpSendDestinationTag', () => {
	let sendContext: SendContext;
	const mockContext = new Map();

	beforeEach(() => {
		sendContext = initSendContext({ token: XRP_TOKEN });
		mockContext.set(SEND_CONTEXT_KEY, sendContext);
	});

	let lastContainer: HTMLElement;

	const renderInput = (): HTMLInputElement => {
		const { container } = render(XrpSendDestinationTag, { context: mockContext });
		const input = container.querySelector('input');

		expect(input).not.toBeNull();

		lastContainer = container;

		return input as HTMLInputElement;
	};

	const error = () => lastContainer.querySelector('[data-tid="xrp-destination-tag-error"]');

	it('stores a valid destination tag', async () => {
		const input = renderInput();

		await fireEvent.input(input, { target: { value: '12345' } });

		expect(get(sendContext.sendXrpDestinationTag)).toBe(12345);
	});

	it('keeps a zero tag (a distinct, valid tag)', async () => {
		const input = renderInput();

		await fireEvent.input(input, { target: { value: '0' } });

		expect(get(sendContext.sendXrpDestinationTag)).toBe(0);
	});

	it('ignores an out-of-range tag', async () => {
		const input = renderInput();

		await fireEvent.input(input, { target: { value: '99999999999' } });

		expect(get(sendContext.sendXrpDestinationTag)).toBeUndefined();
	});

	// A tag the user typed that does not parse must be reported, not silently dropped: sending to
	// an exchange deposit address without its tag is not auto-creditable.
	it.each(['abc', '-1', '1.5', '99999999999', '1e3', '0x10'])(
		'reports %j as invalid instead of dropping it silently',
		async (value) => {
			const input = renderInput();

			await fireEvent.input(input, { target: { value } });

			expect(error()).not.toBeNull();
			expect(get(sendContext.sendXrpDestinationTag)).toBeUndefined();
		}
	);

	it.each(['0', '12345', '4294967295'])('reports no error for the valid tag %j', async (value) => {
		const input = renderInput();

		await fireEvent.input(input, { target: { value } });

		expect(error()).toBeNull();
		expect(get(sendContext.sendXrpDestinationTag)).toBe(Number(value));
	});

	// Empty means "no tag", which is a valid choice.
	it('clears the error when the field is emptied', async () => {
		const input = renderInput();

		await fireEvent.input(input, { target: { value: 'abc' } });

		expect(error()).not.toBeNull();

		await fireEvent.input(input, { target: { value: '' } });

		// The error element slides out, so it lingers in the DOM until the transition ends.
		await waitFor(() => {
			expect(error()).toBeNull();
		});

		expect(get(sendContext.sendXrpDestinationTag)).toBeUndefined();
	});

	it('clears the tag when the field is emptied', async () => {
		const input = renderInput();

		await fireEvent.input(input, { target: { value: '5' } });
		await fireEvent.input(input, { target: { value: '' } });

		expect(get(sendContext.sendXrpDestinationTag)).toBeUndefined();
	});

	// The error appears on input and blocks the form. Without a live region a screen-reader user
	// gets a form that will not advance and no statement of why.
	it('announces the error to screen readers', async () => {
		const input = renderInput();

		await fireEvent.input(input, { target: { value: 'abc' } });

		expect(error()).not.toBeNull();
		expect(error()?.getAttribute('role')).toBe('alert');
	});

	// The wizard keys its step subtree on the step name, so returning from review destroys and
	// recreates this input. Seeding the field from the stored tag is the only thing that puts it
	// back on screen, and losing it would be invisible: the tag stays in the context and is still
	// sent, while the field reads empty and the user concludes none is attached.
	describe('initialization from the stored tag', () => {
		it('shows a tag already held in the context', () => {
			sendContext.sendXrpDestinationTag.set(12345);

			expect(renderInput().value).toBe('12345');
		});

		// Zero is a valid tag and a falsy value: a truthiness check here would blank it.
		it('shows a stored tag of zero', () => {
			sendContext.sendXrpDestinationTag.set(0);

			expect(renderInput().value).toBe('0');
		});

		it('starts empty when no tag is stored', () => {
			expect(renderInput().value).toBe('');
		});
	});
});
