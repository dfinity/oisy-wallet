import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import IcSendReview from '$icp/components/send/IcSendReview.svelte';
import { isIcMintingAccount } from '$icp/stores/ic-minting-account.store';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('IcSendReview', () => {
	const mockContext = new Map([]);
	mockContext.set(
		SEND_CONTEXT_KEY,
		initSendContext({
			token: ICP_TOKEN
		})
	);

	const props = {
		destination: '0xF2777205439a8c7be0425cbb21D8DB7426Df5DE9',
		amount: 22_000_000,
		onBack: vi.fn(),
		onSend: vi.fn()
	};

	const toolbarSelector = 'div[data-tid="toolbar"]';

	beforeEach(() => {
		vi.clearAllMocks();

		isIcMintingAccount.set(false);
	});

	it('should render all fields', () => {
		const { container, getByText } = render(IcSendReview, {
			props,
			context: mockContext
		});

		expect(container).toHaveTextContent(`${props.amount} ${ICP_TOKEN.symbol}`);

		expect(getByText(en.send.text.network)).toBeInTheDocument();

		expect(getByText(en.fee.text.fee)).toBeInTheDocument();

		const toolbar: HTMLDivElement | null = container.querySelector(toolbarSelector);

		expect(toolbar).not.toBeNull();
	});

	it('should not render the fee if the user is the minting account', () => {
		isIcMintingAccount.set(true);

		const { queryByText } = render(IcSendReview, {
			props,
			context: mockContext
		});

		expect(queryByText(en.fee.text.fee)).toBeNull();
	});
});
