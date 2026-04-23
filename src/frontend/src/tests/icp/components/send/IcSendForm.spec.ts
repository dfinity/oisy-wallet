import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import IcSendForm from '$icp/components/send/IcSendForm.svelte';
import { isIcMintingAccount } from '$icp/stores/ic-minting-account.store';
import {
	SEND_DESTINATION_SECTION,
	SEND_FORM_NEXT_BUTTON,
	TOKEN_INPUT_CURRENCY_TOKEN
} from '$lib/constants/test-ids.constants';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import en from '$tests/mocks/i18n.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';

describe('IcSendForm', () => {
	const mockContext = new Map([]);
	mockContext.set(
		SEND_CONTEXT_KEY,
		initSendContext({
			token: ETHEREUM_TOKEN
		})
	);

	const props = {
		destination: '0xF2777205439a8c7be0425cbb21D8DB7426Df5DE9',
		amount: 22_000_000,
		source: '0xF2777205439a8c7be0425cbb21D8DB7426Df5DE9',
		onBack: vi.fn(),
		onNext: vi.fn(),
		onTokensList: vi.fn(),
		cancel: mockSnippet
	};

	const amountSelector = `input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`;
	const toolbarSelector = 'div[data-tid="toolbar"]';

	beforeEach(() => {
		isIcMintingAccount.set(false);
	});

	it('should render all fields', () => {
		const { container, getByTestId, getByText } = render(IcSendForm, {
			props,
			context: mockContext
		});

		const amount: HTMLInputElement | null = container.querySelector(amountSelector);

		expect(amount).not.toBeNull();

		expect(getByTestId(SEND_DESTINATION_SECTION)).toBeInTheDocument();

		expect(getByText(en.fee.text.fee)).toBeInTheDocument();

		const toolbar: HTMLDivElement | null = container.querySelector(toolbarSelector);

		expect(toolbar).not.toBeNull();
	});

	it('should not render the memo input field for non-IC destinations', () => {
		const { queryByPlaceholderText } = render(IcSendForm, {
			props,
			context: mockContext
		});

		expect(queryByPlaceholderText(en.send.placeholder.enter_memo)).toBeNull();
		expect(queryByPlaceholderText(en.send.placeholder.enter_memo_nat64)).toBeNull();
	});

	it('should render the free-text memo input field for ICRC destinations', () => {
		const { getByPlaceholderText } = render(IcSendForm, {
			props: { ...props, destination: 'rrkah-fqaaa-aaaaa-aaaaq-cai' },
			context: mockContext
		});

		expect(getByPlaceholderText(en.send.placeholder.enter_memo)).toBeInTheDocument();
	});

	it('should render the nat64 memo input field for classic ICP destinations', () => {
		const { getByPlaceholderText } = render(IcSendForm, {
			props: {
				...props,
				destination: '6c04faf793b42b156206f805d13ba1b3b697ec18f519e6a11484eed091859d5a'
			},
			context: mockContext
		});

		expect(getByPlaceholderText(en.send.placeholder.enter_memo_nat64)).toBeInTheDocument();
	});

	it('should show an error and disable submit for an invalid nat64 memo', () => {
		const context = initSendContext({ token: ETHEREUM_TOKEN });
		context.sendMemo.set('not-a-number');
		const contextWithMemo = new Map([[SEND_CONTEXT_KEY, context]]);

		const { getByText, getByTestId } = render(IcSendForm, {
			props: {
				...props,
				destination: '6c04faf793b42b156206f805d13ba1b3b697ec18f519e6a11484eed091859d5a'
			},
			context: contextWithMemo
		});

		expect(getByText(en.send.assertion.invalid_nat64_memo)).toBeInTheDocument();
		expect(getByTestId(SEND_FORM_NEXT_BUTTON)).toBeDisabled();
	});

	it('should not render the fee if the user is the minting account', () => {
		isIcMintingAccount.set(true);

		const { queryByText } = render(IcSendForm, {
			props,
			context: mockContext
		});

		expect(queryByText(en.fee.text.fee)).toBeNull();
	});
});
