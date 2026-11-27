import { XRP_MAINNET_NETWORK } from '$env/networks/networks.xrp.env';
import { RLUSD_TOKEN } from '$env/tokens/tokens-xrp/tokens.rlusd.env';
import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { contactsStore } from '$lib/stores/contacts.store';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import { getMockContactsUi } from '$tests/mocks/contacts.mock';
import en from '$tests/mocks/i18n.mock';
import XrpSendReview from '$xrp/components/send/XrpSendReview.svelte';
import {
	XRP_FEE_CONTEXT_KEY,
	initFeeStore,
	initReserveStore,
	initTransferRateStore,
	initXrpFeeContext
} from '$xrp/stores/xrp-fee.store';
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
				reserveStore: initReserveStore(),
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

	it('warns that a destination tag may be required when none is set', () => {
		const { getByTestId } = render(XrpSendReview, { props, context: mockContext });

		expect(getByTestId('xrp-review-destination-tag-missing')).toHaveTextContent(
			en.send.info.xrp_destination_tag_missing
		);
	});

	it('does not warn when a destination tag is set', () => {
		sendContext.sendXrpDestinationTag.set(0);

		const { queryByTestId } = render(XrpSendReview, { props, context: mockContext });

		expect(queryByTestId('xrp-review-destination-tag-missing')).toBeNull();
	});

	describe('destination contact', () => {
		const [alice] = getMockContactsUi({
			n: 1,
			name: 'Alice',
			addresses: [{ addressType: 'Xrp', address: props.destination, label: 'Cold wallet' }]
		});

		afterEach(() => {
			contactsStore.reset();
		});

		it('shows the name and alias of a contact that holds the destination', () => {
			contactsStore.set([alice]);

			const { getByText } = render(XrpSendReview, { props, context: mockContext });

			expect(getByText(/Alice/)).toHaveTextContent('Cold wallet');
		});

		it('shows the name and alias of the picked contact', () => {
			const { getByText } = render(XrpSendReview, {
				props: { ...props, selectedContact: alice },
				context: mockContext
			});

			expect(getByText(/Alice/)).toHaveTextContent('Cold wallet');
		});
	});

	// The fee a token's issuer charges is paid in the token, on top of the amount, so the review
	// states it in the token.
	describe('a trust-line token', () => {
		const transferRateStore = initTransferRateStore();

		const renderTokenReview = (destination = props.destination) => {
			const context = new Map();

			context.set(SEND_CONTEXT_KEY, initSendContext({ token: RLUSD_TOKEN }));
			context.set(
				XRP_FEE_CONTEXT_KEY,
				initXrpFeeContext({
					reserveStore: initReserveStore(),
					feeStore,
					transferRateStore,
					feeSymbolStore: writable(XRP_TOKEN.symbol),
					feeDecimalsStore: writable(XRP_TOKEN.decimals),
					feeTokenIdStore: writable(XRP_TOKEN.id),
					feeExchangeRateStore: writable(0.5)
				})
			);

			return render(XrpSendReview, { props: { ...props, destination }, context });
		};

		it('states the transfer fee in the token', () => {
			transferRateStore.setTransferRate(1_005_000_000);

			const { getByTestId } = renderTokenReview();

			// 0.5 % of 22.
			expect(getByTestId('xrp-review-transfer-fee')).toHaveTextContent(
				`${en.send.text.xrp_transfer_fee} 0.11 ${RLUSD_TOKEN.symbol}`
			);
		});

		it('states no transfer fee when the issuer charges none', () => {
			transferRateStore.setTransferRate(1_000_000_000);

			const { queryByTestId } = renderTokenReview();

			expect(queryByTestId('xrp-review-transfer-fee')).toBeNull();
		});

		it('states no transfer fee on a payment to the issuer', () => {
			transferRateStore.setTransferRate(1_005_000_000);

			const { queryByTestId } = renderTokenReview(RLUSD_TOKEN.issuer);

			expect(queryByTestId('xrp-review-transfer-fee')).toBeNull();
		});
	});
});
