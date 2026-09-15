import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import XrpSendDestinationTag from '$xrp/components/send/XrpSendDestinationTag.svelte';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('XrpSendDestinationTag', () => {
	let sendContext: SendContext;
	const mockContext = new Map();

	beforeEach(() => {
		sendContext = initSendContext({ token: XRP_TOKEN });
		mockContext.set(SEND_CONTEXT_KEY, sendContext);
	});

	const renderInput = (): HTMLInputElement => {
		const { container } = render(XrpSendDestinationTag, { context: mockContext });
		const input = container.querySelector('input');

		expect(input).not.toBeNull();

		return input as HTMLInputElement;
	};

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

	it('clears the tag when the field is emptied', async () => {
		const input = renderInput();

		await fireEvent.input(input, { target: { value: '5' } });
		await fireEvent.input(input, { target: { value: '' } });

		expect(get(sendContext.sendXrpDestinationTag)).toBeUndefined();
	});
});
