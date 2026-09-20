import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { balancesStore } from '$lib/stores/balances.store';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import XrpSendForm from '$xrp/components/send/XrpSendForm.svelte';
import {
	XRP_FEE_CONTEXT_KEY,
	initFeeStore,
	initReserveStore,
	initXrpFeeContext
} from '$xrp/stores/xrp-fee.store';
import { getXrpReserveDrops } from '$xrp/utils/xrp-send.utils';
import { fireEvent, render } from '@testing-library/svelte';
import { writable } from 'svelte/store';

describe('XrpSendForm', () => {
	const mockContext = new Map();
	const feeStore = initFeeStore();
	const reserveStore = initReserveStore();

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
		reserveStore.setReserve(getXrpReserveDrops({ ownerCount: 0 }));

		balancesStore.reset(XRP_TOKEN.id);
		balancesStore.set({ id: XRP_TOKEN.id, data: { data: 5_000_000n, certified: true } });

		mockContext.set(SEND_CONTEXT_KEY, initSendContext({ token: XRP_TOKEN }));
		mockContext.set(
			XRP_FEE_CONTEXT_KEY,
			initXrpFeeContext({
				reserveStore,
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

	// The tag is optional, and `Input` defaults `required` to true. Inside SendForm's native form
	// that makes browser constraint validation refuse to submit while the field is empty — which
	// the `disabled` assertions cannot see, so this asserts form validity directly.
	describe('native form validity', () => {
		const tagInput = (container: HTMLElement): HTMLInputElement =>
			container.querySelector<HTMLInputElement>(
				'input[name="xrp-destination-tag"]'
			) as HTMLInputElement;

		it('does not mark the optional destination tag as required', () => {
			const { container } = render(XrpSendForm, { props, context: mockContext });

			expect(tagInput(container).required).toBeFalsy();
		});

		it('submits with the destination tag left empty', () => {
			const { container } = render(XrpSendForm, { props, context: mockContext });

			expect(tagInput(container).value).toBe('');
			expect(container.querySelector('form')?.checkValidity()).toBeTruthy();
		});

		it('still submits with a valid destination tag', async () => {
			const { container } = render(XrpSendForm, { props, context: mockContext });

			await fireEvent.input(tagInput(container), { target: { value: '12345' } });

			expect(container.querySelector('form')?.checkValidity()).toBeTruthy();
		});
	});

	// With the reserve unknown nothing may be sent. The balance check alone does not cover it:
	// that check is skipped when the balance is also unavailable, so the amount must be rejected
	// on the unknown reserve itself.
	describe('unknown reserve', () => {
		const amountInput = (container: HTMLElement): HTMLInputElement =>
			container.querySelector('input') as HTMLInputElement;

		const nextBtn = (container: HTMLElement): HTMLButtonElement | null =>
			container.querySelector<HTMLButtonElement>('button[data-tid="send-form-next-button"]');

		it('disables next when both the reserve and the balance are unavailable', async () => {
			reserveStore.setReserve(undefined);
			balancesStore.reset(XRP_TOKEN.id);

			const { container } = render(XrpSendForm, { props, context: mockContext });

			await fireEvent.input(amountInput(container), { target: { value: '1' } });

			expect(nextBtn(container)?.disabled).toBeTruthy();
		});

		it('enables next once the reserve is known', async () => {
			reserveStore.setReserve(undefined);
			balancesStore.reset(XRP_TOKEN.id);

			const { container } = render(XrpSendForm, { props, context: mockContext });

			await fireEvent.input(amountInput(container), { target: { value: '1' } });

			expect(nextBtn(container)?.disabled).toBeTruthy();

			reserveStore.setReserve(getXrpReserveDrops({ ownerCount: 0 }));

			await fireEvent.input(amountInput(container), { target: { value: '1' } });

			expect(nextBtn(container)?.disabled).toBeFalsy();
		});
	});

	// The fee and the reserve are loaded by two independent requests, so `account_info` can answer
	// first and leave the fee unknown. Next must wait for it: the review step prices the send
	// against the fee and `XrpFeeDisplay` renders nothing without one, so proceeding would show a
	// review with no fee at all. The balance is cleared for the same reason as above — with the
	// fee unknown the whole balance is unavailable, so the amount error would fire and mask which
	// term actually disabled the button.
	describe('unknown fee', () => {
		const amountInput = (container: HTMLElement): HTMLInputElement =>
			container.querySelector('input') as HTMLInputElement;

		const nextBtn = (container: HTMLElement): HTMLButtonElement | null =>
			container.querySelector<HTMLButtonElement>('button[data-tid="send-form-next-button"]');

		it('disables next while the fee is unknown, even with the reserve known', async () => {
			feeStore.setFee(undefined);
			balancesStore.reset(XRP_TOKEN.id);

			const { container } = render(XrpSendForm, { props, context: mockContext });

			await fireEvent.input(amountInput(container), { target: { value: '1' } });

			expect(nextBtn(container)?.disabled).toBeTruthy();
		});

		// The amount is typed while the fee is still loading and then left alone. `unavailable` is
		// the whole balance in that window, so the balance comparison would reject the amount — and
		// `TokenInputContent` validates from an effect tracking `[amount, token]`, so nothing would
		// clear that error when the fee lands. Next has to enable on its own.
		it('strands no error from an amount typed before the fee arrived', async () => {
			vi.useFakeTimers();

			feeStore.setFee(undefined);

			const { container } = render(XrpSendForm, { props, context: mockContext });

			await fireEvent.input(amountInput(container), { target: { value: '1' } });

			// Past the validation debounce, so any error the placeholder records has been recorded.
			await vi.advanceTimersByTimeAsync(500);

			expect(nextBtn(container)?.disabled).toBeTruthy();

			feeStore.setFee(12n);

			await vi.advanceTimersByTimeAsync(500);

			expect(nextBtn(container)?.disabled).toBeFalsy();

			vi.useRealTimers();
		});

		it('enables next once the fee is known', async () => {
			feeStore.setFee(undefined);
			balancesStore.reset(XRP_TOKEN.id);

			const { container } = render(XrpSendForm, { props, context: mockContext });

			await fireEvent.input(amountInput(container), { target: { value: '1' } });

			expect(nextBtn(container)?.disabled).toBeTruthy();

			feeStore.setFee(12n);

			await fireEvent.input(amountInput(container), { target: { value: '1' } });

			expect(nextBtn(container)?.disabled).toBeFalsy();
		});
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
