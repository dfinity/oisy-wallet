import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import XrpSendForm from '$xrp/components/send/XrpSendForm.svelte';
import {
	XRP_FEE_CONTEXT_KEY,
	initFeeStore,
	initReserveStore,
	initXrpFeeContext
} from '$xrp/stores/xrp-fee.store';
import { fireEvent, render } from '@testing-library/svelte';
import { writable } from 'svelte/store';

describe('XrpSendForm', () => {
	const mockContext = new Map();
	const feeStore = initFeeStore();

	const props = {
		destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
		amount: 22,
		onBack: vi.fn(),
		onNext: vi.fn(),
		onTokensList: vi.fn(),
		cancel: mockSnippet
	};

	const toolbarSelector = 'div[data-tid="toolbar"]';

	beforeEach(() => {
		vi.clearAllMocks();

		feeStore.setFee(12n);

		mockContext.set(SEND_CONTEXT_KEY, initSendContext({ token: XRP_TOKEN }));
		mockContext.set(
			XRP_FEE_CONTEXT_KEY,
			initXrpFeeContext({
				reserveStore: initReserveStore(),
				feeStore,
				feeSymbolStore: writable(XRP_TOKEN.symbol),
				feeDecimalsStore: writable(XRP_TOKEN.decimals),
				feeTokenIdStore: writable(XRP_TOKEN.id),
				feeExchangeRateStore: writable(0.5)
			})
		);
	});

	it('renders the send form with an amount input and toolbar', () => {
		const { container } = render(XrpSendForm, { props, context: mockContext });

		expect(container.querySelector('input')).not.toBeNull();
		expect(container.querySelector(toolbarSelector)).not.toBeNull();
	});

	// A tag the user typed that does not parse must block the form: proceeding would send to an
	// exchange deposit address without its tag, which is not auto-creditable.
	describe('destination tag validity', () => {
		const tagInput = (container: HTMLElement): HTMLInputElement => {
			const input = container.querySelector<HTMLInputElement>('input[name="xrp-destination-tag"]');

			expect(input).not.toBeNull();

			return input as HTMLInputElement;
		};

		const nextButton = (container: HTMLElement): HTMLButtonElement | null =>
			container.querySelector<HTMLButtonElement>('button[data-tid="send-form-next-button"]');

		it('disables next while a non-empty tag is invalid', async () => {
			const { container } = render(XrpSendForm, { props, context: mockContext });

			await fireEvent.input(tagInput(container), { target: { value: 'abc' } });

			expect(nextButton(container)?.disabled).toBeTruthy();
		});

		it('re-enables next once the invalid tag is cleared', async () => {
			const { container } = render(XrpSendForm, { props, context: mockContext });

			await fireEvent.input(tagInput(container), { target: { value: 'abc' } });

			expect(nextButton(container)?.disabled).toBeTruthy();

			await fireEvent.input(tagInput(container), { target: { value: '' } });

			expect(nextButton(container)?.disabled).toBeFalsy();
		});

		it('keeps next enabled for a valid tag', async () => {
			const { container } = render(XrpSendForm, { props, context: mockContext });

			await fireEvent.input(tagInput(container), { target: { value: '12345' } });

			expect(nextButton(container)?.disabled).toBeFalsy();
		});
	});
});
