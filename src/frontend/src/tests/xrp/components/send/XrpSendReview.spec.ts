import { XRP_MAINNET_NETWORK } from '$env/networks/networks.xrp.env';
import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import en from '$tests/mocks/i18n.mock';
import XrpSendReview from '$xrp/components/send/XrpSendReview.svelte';
import { XRP_FEE_CONTEXT_KEY, initFeeStore, initXrpFeeContext } from '$xrp/stores/xrp-fee.store';
import { render } from '@testing-library/svelte';
import { writable } from 'svelte/store';

describe('XrpSendReview', () => {
	const props = {
		destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
		amount: 22,
		network: XRP_MAINNET_NETWORK,
		onBack: vi.fn(),
		onSend: vi.fn()
	};
	const toolbarSelector = 'div[data-tid="toolbar"]';

	const feeStore = initFeeStore();
	let sendContext: SendContext;
	const mockContext = new Map();

	beforeEach(() => {
		vi.clearAllMocks();

		sendContext = initSendContext({ token: XRP_TOKEN });
		mockContext.set(SEND_CONTEXT_KEY, sendContext);

		feeStore.setFee(12n);
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

	it('renders the amount, network, fee and toolbar', () => {
		const { container, getByText } = render(XrpSendReview, { props, context: mockContext });

		expect(container).toHaveTextContent(`${props.amount} ${XRP_TOKEN.symbol}`);
		expect(getByText(en.send.text.network)).toBeInTheDocument();
		expect(getByText(en.fee.text.fee)).toBeInTheDocument();
		expect(container.querySelector(toolbarSelector)).not.toBeNull();
	});

	it('shows the destination tag when one is set', () => {
		sendContext.sendXrpDestinationTag.set(12345);

		const { getByText } = render(XrpSendReview, { props, context: mockContext });

		expect(getByText('12345')).toBeInTheDocument();
	});
});
