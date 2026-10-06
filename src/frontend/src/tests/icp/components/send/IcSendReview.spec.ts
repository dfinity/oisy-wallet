import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import IcSendReview from '$icp/components/send/IcSendReview.svelte';
import { isIcMintingAccount } from '$icp/stores/ic-minting-account.store';
import { CYCLES_SENT_TO_CANISTER_WARNING } from '$lib/constants/test-ids.constants';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import { mockTcyclesToken } from '$tests/mocks/cycles-mint.mock';
import { mockValidDip721Token } from '$tests/mocks/dip721-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { mockValidDip721Nft } from '$tests/mocks/nfts.mock';
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

	it('should render the fee row as zero when sending an NFT (collections have no transfer fee)', () => {
		const nftContext = new Map([]);
		nftContext.set(
			SEND_CONTEXT_KEY,
			initSendContext({
				token: mockValidDip721Token
			})
		);

		const { container, getByText } = render(IcSendReview, {
			props: { ...props, nft: mockValidDip721Nft },
			context: nftContext
		});

		expect(getByText(en.fee.text.fee)).toBeInTheDocument();

		expect(container).toHaveTextContent(`0 ${mockValidDip721Token.symbol}`);
	});

	it('should warn about TCYCLES sent to a canister', () => {
		const { getByTestId } = render(IcSendReview, {
			props: { ...props, destination: 'ywcsb-maaaa-aaaai-q6k7a-cai' },
			context: new Map([[SEND_CONTEXT_KEY, initSendContext({ token: mockTcyclesToken })]])
		});

		expect(getByTestId(CYCLES_SENT_TO_CANISTER_WARNING)).toBeInTheDocument();
	});

	it('should not warn about another token sent to a canister', () => {
		const { queryByTestId } = render(IcSendReview, {
			props: { ...props, destination: 'ywcsb-maaaa-aaaai-q6k7a-cai' },
			context: mockContext
		});

		expect(queryByTestId(CYCLES_SENT_TO_CANISTER_WARNING)).toBeNull();
	});
});
