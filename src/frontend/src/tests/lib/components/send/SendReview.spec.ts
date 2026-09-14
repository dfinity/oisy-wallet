import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { isIcMintingAccount } from '$icp/stores/ic-minting-account.store';
import SendReview from '$lib/components/send/SendReview.svelte';
import {
	REVIEW_FORM_SEND_BUTTON,
	SEND_FIRST_TIME_DESTINATION_WARNING
} from '$lib/constants/test-ids.constants';
import { contactsStore } from '$lib/stores/contacts.store';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import type { ContactUi } from '$lib/types/contact';
import type { Token } from '$lib/types/token';
import { getMockContactsUi, mockContactEthAddressUi } from '$tests/mocks/contacts.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIcrcAccount } from '$tests/mocks/identity.mock';
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

	it('keeps the send button disabled when the caller disables it, even once confirmed', async () => {
		const { getByTestId } = render(SendReview, {
			props: { ...props, disabled: true },
			context: mockContext()
		});

		await fireEvent.click(getByTestId('checkbox'));

		expect(getByTestId(REVIEW_FORM_SEND_BUTTON)).toBeDisabled();
	});

	it('still warns and gates when the destination is a saved contact', () => {
		const contacts = getMockContactsUi({
			n: 1,
			name: 'Contact with Ethereum address',
			addresses: [mockContactEthAddressUi]
		}) as unknown as ContactUi[];

		contactsStore.set(contacts);

		const { getByTestId } = render(SendReview, { props, context: mockContext() });

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
});
