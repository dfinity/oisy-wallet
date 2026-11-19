import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { XRP_TOKEN, XRP_TOKEN_ID } from '$env/tokens/tokens.xrp.env';
import { isIcMintingAccount } from '$icp/stores/ic-minting-account.store';
import SendReview from '$lib/components/send/SendReview.svelte';
import {
	REVIEW_FORM_SEND_BUTTON,
	SEND_FIRST_TIME_DESTINATION_WARNING
} from '$lib/constants/test-ids.constants';
import { contactsStore } from '$lib/stores/contacts.store';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import type { Token } from '$lib/types/token';
import { getMockContactsUi, mockContactEthAddressUi } from '$tests/mocks/contacts.mock';
import { mockEthAddress, mockEthAddress2 } from '$tests/mocks/eth.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIcrcAccount } from '$tests/mocks/identity.mock';
import { mockXrpAddress, mockXrpAddress2 } from '$tests/mocks/xrp.mock';
import { xrpTransactionsStore } from '$xrp/stores/xrp-transactions.store';
import { encodeIcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('SendReview', () => {
	const props = {
		destination: mockEthAddress,
		amount: '1',
		onBack: vi.fn(),
		onSend: vi.fn()
	};

	const mockContext = (token: Token = ETHEREUM_TOKEN) =>
		new Map<symbol, SendContext>([[SEND_CONTEXT_KEY, initSendContext({ token })]]);

	beforeEach(() => {
		contactsStore.reset();
		isIcMintingAccount.set(false);
	});

	it('warns about a first-time destination and keeps the send button disabled', () => {
		const { getByTestId } = render(SendReview, { props, context: mockContext() });

		expect(getByTestId(SEND_FIRST_TIME_DESTINATION_WARNING)).toBeInTheDocument();
		expect(getByTestId(REVIEW_FORM_SEND_BUTTON)).toBeDisabled();
	});

	it('enables the send button once the first-time destination is confirmed', async () => {
		const { getByTestId } = render(SendReview, { props, context: mockContext() });

		await fireEvent.click(getByTestId('checkbox'));

		expect(getByTestId(REVIEW_FORM_SEND_BUTTON)).toBeEnabled();
	});

	it('re-arms the gate when the destination changes', async () => {
		const { getByTestId, rerender } = render(SendReview, { props, context: mockContext() });

		await fireEvent.click(getByTestId('checkbox'));

		expect(getByTestId(REVIEW_FORM_SEND_BUTTON)).toBeEnabled();

		await rerender({ ...props, destination: mockEthAddress2 });

		expect(getByTestId('checkbox')).not.toBeChecked();
		expect(getByTestId(REVIEW_FORM_SEND_BUTTON)).toBeDisabled();
	});

	it('keeps the send button disabled when the caller disables it, even once confirmed', async () => {
		const { getByTestId } = render(SendReview, {
			props: { ...props, disabled: true },
			context: mockContext()
		});

		await fireEvent.click(getByTestId('checkbox'));

		expect(getByTestId(REVIEW_FORM_SEND_BUTTON)).toBeDisabled();
	});

	it('still warns and gates when the destination is a saved contact', () => {
		// The contact reaches the review through two channels - the prop the wizard fills in and the
		// store its destination card falls back to - so both are set, and an exemption written
		// against either would fail here.
		const [selectedContact] = getMockContactsUi({
			n: 1,
			name: 'Contact with Ethereum address',
			addresses: [mockContactEthAddressUi]
		});
		contactsStore.set([selectedContact]);

		const { getByTestId } = render(SendReview, {
			props: { ...props, selectedContact },
			context: mockContext()
		});

		expect(getByTestId(SEND_FIRST_TIME_DESTINATION_WARNING)).toBeInTheDocument();
		expect(getByTestId(REVIEW_FORM_SEND_BUTTON)).toBeDisabled();
	});

	it('does not warn nor gate without a destination', () => {
		const { queryByTestId, getByTestId } = render(SendReview, {
			props: { ...props, destination: '' },
			context: mockContext()
		});

		expect(queryByTestId(SEND_FIRST_TIME_DESTINATION_WARNING)).not.toBeInTheDocument();
		expect(getByTestId(REVIEW_FORM_SEND_BUTTON)).toBeEnabled();
	});

	it('warns and gates a burn, since sending to a minter account destroys the assets', () => {
		const destination = encodeIcrcAccount(mockIcrcAccount);
		const sendContext = initSendContext({ token: mockValidIcToken });
		// isIcBurning reads the destination from the context, which the wizard step fills in
		sendContext.sendDestination.set(destination);

		const { getByTestId } = render(SendReview, {
			props: { ...props, destination },
			context: new Map<symbol, SendContext>([[SEND_CONTEXT_KEY, sendContext]])
		});

		expect(get(sendContext.isIcBurning)).toBeTruthy();

		expect(getByTestId(SEND_FIRST_TIME_DESTINATION_WARNING)).toBeInTheDocument();
		expect(getByTestId(REVIEW_FORM_SEND_BUTTON)).toBeDisabled();
	});

	it('does not warn nor gate when the user is the minting account', () => {
		isIcMintingAccount.set(true);

		const { queryByTestId, getByTestId } = render(SendReview, { props, context: mockContext() });

		expect(queryByTestId(SEND_FIRST_TIME_DESTINATION_WARNING)).not.toBeInTheDocument();
		expect(getByTestId(REVIEW_FORM_SEND_BUTTON)).toBeEnabled();
	});

	describe('XRP', () => {
		const xrpProps = { ...props, destination: mockXrpAddress2 };

		beforeEach(() => {
			xrpTransactionsStore.reset(XRP_TOKEN_ID);
		});

		it('warns and gates a send to an address never sent to', () => {
			const { getByTestId } = render(SendReview, {
				props: xrpProps,
				context: mockContext(XRP_TOKEN)
			});

			expect(getByTestId(SEND_FIRST_TIME_DESTINATION_WARNING)).toBeInTheDocument();
			expect(getByTestId(REVIEW_FORM_SEND_BUTTON)).toBeDisabled();
		});

		it('does not warn nor gate a send to a recently used address', () => {
			xrpTransactionsStore.append({
				tokenId: XRP_TOKEN_ID,
				transactions: [
					{
						data: {
							id: 'tx1',
							type: 'send',
							status: 'confirmed',
							value: 1_000_000n,
							from: mockXrpAddress,
							to: mockXrpAddress2,
							timestamp: 1_700_000_000n
						},
						certified: false
					}
				]
			});

			const { queryByTestId, getByTestId } = render(SendReview, {
				props: xrpProps,
				context: mockContext(XRP_TOKEN)
			});

			expect(queryByTestId(SEND_FIRST_TIME_DESTINATION_WARNING)).not.toBeInTheDocument();
			expect(getByTestId(REVIEW_FORM_SEND_BUTTON)).toBeEnabled();
		});
	});
});
