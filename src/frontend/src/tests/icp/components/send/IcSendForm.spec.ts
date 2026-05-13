import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import IcSendForm from '$icp/components/send/IcSendForm.svelte';
import { isIcMintingAccount } from '$icp/stores/ic-minting-account.store';
import {
	SEND_DESTINATION_SECTION,
	TOKEN_INPUT_CURRENCY_TOKEN
} from '$lib/constants/test-ids.constants';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import en from '$tests/mocks/i18n.mock';
import { mockAccountIdentifierText } from '$tests/mocks/identity.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { fireEvent, render } from '@testing-library/svelte';

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

	it('should not render the fee if the user is the minting account', () => {
		isIcMintingAccount.set(true);

		const { queryByText } = render(IcSendForm, {
			props,
			context: mockContext
		});

		expect(queryByText(en.fee.text.fee)).toBeNull();
	});

	it('should render the memo label and input', () => {
		const { getByText, getByPlaceholderText } = render(IcSendForm, {
			props,
			context: mockContext
		});

		expect(getByText(en.send.text.memo)).toBeInTheDocument();
		expect(getByPlaceholderText(en.send.placeholder.enter_memo)).toBeInTheDocument();
	});

	it('should render memo input as optional', () => {
		const { getByPlaceholderText } = render(IcSendForm, {
			props,
			context: mockContext
		});

		const memoInput = getByPlaceholderText(en.send.placeholder.enter_memo);

		expect(memoInput).not.toBeRequired();
	});

	describe('with classic ICP address destination', () => {
		let icpMockContext: Map<symbol, ReturnType<typeof initSendContext>>;

		const icpProps = {
			...props,
			destination: mockAccountIdentifierText
		};

		beforeEach(() => {
			icpMockContext = new Map([[SEND_CONTEXT_KEY, initSendContext({ token: ICP_TOKEN })]]);
		});

		it('should use the nat64 placeholder when destination is a classic ICP address', () => {
			const { getByPlaceholderText } = render(IcSendForm, {
				props: icpProps,
				context: icpMockContext
			});

			expect(getByPlaceholderText(en.send.placeholder.enter_memo_nat64)).toBeInTheDocument();
		});

		it('should show a validation error when memo is not a valid nat64', async () => {
			const { getByPlaceholderText, getByText } = render(IcSendForm, {
				props: icpProps,
				context: icpMockContext
			});

			const memoInput = getByPlaceholderText(en.send.placeholder.enter_memo_nat64);

			await fireEvent.input(memoInput, { target: { value: 'not-a-number' } });

			expect(getByText(en.send.assertion.memo_invalid_nat64)).toBeInTheDocument();
		});

		it('should not show a validation error when memo is a valid nat64', async () => {
			const { getByPlaceholderText, queryByText } = render(IcSendForm, {
				props: icpProps,
				context: icpMockContext
			});

			const memoInput = getByPlaceholderText(en.send.placeholder.enter_memo_nat64);

			await fireEvent.input(memoInput, { target: { value: '12345' } });

			expect(queryByText(en.send.assertion.memo_invalid_nat64)).toBeNull();
		});

		it('should not show a validation error when memo is empty', () => {
			const { queryByText } = render(IcSendForm, {
				props: icpProps,
				context: icpMockContext
			});

			expect(queryByText(en.send.assertion.memo_invalid_nat64)).toBeNull();
		});
	});
});
