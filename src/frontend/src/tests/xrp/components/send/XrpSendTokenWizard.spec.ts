import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { REVIEW_FORM_SEND_BUTTON } from '$lib/constants/test-ids.constants';
import * as addressesStore from '$lib/derived/address.derived';
import { ProgressStepsSendXrp } from '$lib/enums/progress-steps';
import { WizardStepsSend } from '$lib/enums/wizard-steps';
import { balancesStore } from '$lib/stores/balances.store';
import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
import type { Token } from '$lib/types/token';
import { parseToken } from '$lib/utils/parse.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockXrpAddress } from '$tests/mocks/xrp.mock';
import { mockContextMap } from '$tests/utils/context.test-utils';
import { mockSendContextEntry } from '$tests/utils/send.context.test-utils';
import XrpSendTokenWizard from '$xrp/components/send/XrpSendTokenWizard.svelte';
import * as xrplRest from '$xrp/rest/xrpl.rest';
import * as xrpSendServices from '$xrp/services/xrp-send.services';
import { XrpNetworks } from '$xrp/types/network';
import { getXrpReserveDrops } from '$xrp/utils/xrp-send.utils';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { readable } from 'svelte/store';

// XRP is force-disabled under TEST, so `isNetworkIdXrp` in `send` would reject every attempt and
// each "did not call" assertion below would pass for the wrong reason. Enable the catalog here.
vi.mock('$env/networks/networks.xrp.env', async () => {
	const actual = await vi.importActual<Record<string, unknown>>('$env/networks/networks.xrp.env');

	return {
		...actual,
		XRP_MAINNET_ENABLED: true,
		SUPPORTED_XRP_NETWORKS: [actual.XRP_MAINNET_NETWORK],
		SUPPORTED_XRP_NETWORK_IDS: [actual.XRP_MAINNET_NETWORK_ID]
	};
});

describe('XrpSendTokenWizard', () => {
	const destination = 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe';
	const sendAmount = 1;
	const balance = 50_000_000n;
	const nodeFee = 12n;
	const ownerCount = 2;

	const onBack = vi.fn();
	const onClose = vi.fn();
	const onNext = vi.fn();
	const onSendBack = vi.fn();
	const onTokensList = vi.fn();

	const props = {
		currentStep: { name: WizardStepsSend.REVIEW, title: 'title' },
		sendProgressStep: ProgressStepsSendXrp.INITIALIZATION,
		amount: sendAmount,
		destination,
		onBack,
		onClose,
		onNext,
		onSendBack,
		onTokensList
	};

	const mockContext = ({ token = XRP_TOKEN }: { token?: Token } = {}) =>
		mockContextMap([mockSendContextEntry({ token })]);

	const clickSend = async (container: HTMLElement) => {
		const button: HTMLButtonElement | null = container.querySelector(
			`[data-tid="${REVIEW_FORM_SEND_BUTTON}"]`
		);

		assertNonNullish(button, 'Send button not found');

		await fireEvent.click(button);
	};

	// The wizard owns the fee context, and `XrpFeeContext` fills it from these two calls. The send
	// guard refuses while the reserve is unknown, so the render has to settle before clicking.
	const renderSettled = async (context = mockContext()) => {
		const rendered = render(XrpSendTokenWizard, { props, context });

		await waitFor(() => {
			expect(xrplRest.loadXrpAccountInfo).toHaveBeenCalled();
		});

		return rendered;
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockAuthStore();

		vi.spyOn(addressesStore, 'xrpAddressMainnet', 'get').mockImplementation(() =>
			readable(mockXrpAddress)
		);

		balancesStore.reset(XRP_TOKEN.id);
		balancesStore.set({ id: XRP_TOKEN.id, data: { data: balance, certified: true } });

		vi.spyOn(xrplRest, 'loadXrpOpenLedgerFee').mockResolvedValue(nodeFee);
		vi.spyOn(xrplRest, 'loadXrpAccountInfo').mockResolvedValue({
			balance,
			sequence: 7,
			ownerCount
		});
		vi.spyOn(xrpSendServices, 'sendXrp').mockResolvedValue({
			engineResult: 'tesSUCCESS',
			engineResultMessage: 'The transaction was applied.',
			txHash: 'HASH',
			accepted: true
		});
	});

	it('should call sendXrp with the parsed amount, network and source', async () => {
		const { container } = await renderSettled();

		await clickSend(container);

		expect(xrpSendServices.sendXrp).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				identity: mockIdentity,
				network: XrpNetworks.mainnet,
				source: mockXrpAddress,
				destination,
				amount: parseToken({ value: `${sendAmount}`, unitName: XRP_TOKEN.decimals })
			})
		);
	});

	it('should pass the destination tag through when one is set', async () => {
		const context = mockContextMap([mockSendContextEntry({ token: XRP_TOKEN })]);
		const sendContext = context.get(SEND_CONTEXT_KEY) as SendContext;

		sendContext.sendDestination.set(destination);
		sendContext.sendXrpDestinationTag.set(12_345);

		const { container } = await renderSettled(context);

		await clickSend(container);

		expect(xrpSendServices.sendXrp).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ destinationTag: 12_345 })
		);
	});

	it('should send no destination tag when none is set', async () => {
		const { container } = await renderSettled();

		await clickSend(container);

		expect(xrpSendServices.sendXrp).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ destinationTag: undefined })
		);
	});

	it('should not call sendXrp without an authenticated identity', async () => {
		mockAuthStore(null);

		const { container } = await renderSettled();

		await clickSend(container);

		expect(xrpSendServices.sendXrp).not.toHaveBeenCalled();
	});

	// A non-XRP token never reaches `loadReserve`, so this one cannot wait for it to settle.
	it('should not call sendXrp when the network is not XRP', async () => {
		const { container } = render(XrpSendTokenWizard, {
			props,
			context: mockContext({ token: ETHEREUM_TOKEN })
		});

		await clickSend(container);

		expect(xrpSendServices.sendXrp).not.toHaveBeenCalled();
		expect(xrplRest.loadXrpAccountInfo).not.toHaveBeenCalled();
	});

	it('should not call sendXrp with an empty destination', async () => {
		const rendered = render(XrpSendTokenWizard, {
			props: { ...props, destination: '' },
			context: mockContext()
		});

		await waitFor(() => {
			expect(xrplRest.loadXrpAccountInfo).toHaveBeenCalled();
		});

		await clickSend(rendered.container);

		expect(xrpSendServices.sendXrp).not.toHaveBeenCalled();
	});

	// `invalidAmount` rejects nullish and negatives. It does NOT reject 0 — the form blocks that
	// separately — so 0 is deliberately not asserted here.
	it.each([-1, undefined])('should not call sendXrp with the amount %j', async (amount) => {
		const rendered = render(XrpSendTokenWizard, {
			props: { ...props, amount },
			context: mockContext()
		});

		await waitFor(() => {
			expect(xrplRest.loadXrpAccountInfo).toHaveBeenCalled();
		});

		await clickSend(rendered.container);

		expect(xrpSendServices.sendXrp).not.toHaveBeenCalled();
	});

	// The form validated the amount against the fee and reserve as they were when it was typed, so
	// the send path re-checks it against the current figures.
	it('should not call sendXrp when the amount exceeds the sendable maximum', async () => {
		const overMax = Number(balance - nodeFee - getXrpReserveDrops({ ownerCount })) / 1_000_000 + 1;

		const rendered = render(XrpSendTokenWizard, {
			props: { ...props, amount: overMax },
			context: mockContext()
		});

		await waitFor(() => {
			expect(xrplRest.loadXrpAccountInfo).toHaveBeenCalled();
		});

		await clickSend(rendered.container);

		expect(xrpSendServices.sendXrp).not.toHaveBeenCalled();
	});

	// An operational `account_info` failure leaves the reserve unknown, and no amount can be judged
	// sendable against a figure that is not known.
	it('should not call sendXrp while the reserve is unknown', async () => {
		vi.spyOn(xrplRest, 'loadXrpAccountInfo').mockRejectedValue(new Error('network down'));

		const { container } = await renderSettled();

		await clickSend(container);

		expect(xrpSendServices.sendXrp).not.toHaveBeenCalled();
	});

	it('should advance the wizard before sending', async () => {
		const { container } = await renderSettled();

		await clickSend(container);

		expect(onNext).toHaveBeenCalled();
	});

	it('should not advance the wizard when a guard rejects the send', async () => {
		const rendered = render(XrpSendTokenWizard, {
			props: { ...props, destination: '' },
			context: mockContext()
		});

		await waitFor(() => {
			expect(xrplRest.loadXrpAccountInfo).toHaveBeenCalled();
		});

		await clickSend(rendered.container);

		expect(onNext).not.toHaveBeenCalled();
	});
});
