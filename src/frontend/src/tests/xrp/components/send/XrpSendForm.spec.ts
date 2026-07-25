import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import XrpSendForm from '$xrp/components/send/XrpSendForm.svelte';
import { XRP_FEE_CONTEXT_KEY, initFeeStore, initXrpFeeContext } from '$xrp/stores/xrp-fee.store';
import { render } from '@testing-library/svelte';
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
});
