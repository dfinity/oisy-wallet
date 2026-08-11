import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { USDC_SYMBOL, USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import EthWalletConnectSendReview from '$eth/components/wallet-connect/EthWalletConnectSendReview.svelte';
import { ERC20_APPROVE_HASH, ERC20_TRANSFER_HASH } from '$eth/constants/erc20.constants';
import { erc20CustomTokensStore } from '$eth/stores/erc20-custom-tokens.store';
import { erc20DefaultTokensStore } from '$eth/stores/erc20-default-tokens.store';
import { ZERO } from '$lib/constants/app.constants';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { AbiCoder } from 'ethers/abi';

describe('EthWalletConnectSendReview', () => {
	const RECIPIENT = '0x96329840d29ab4ac4A324cA0B01F64EAE7aA7a6a';
	const UNKNOWN_CONTRACT = '0xcA11bde05977b3631167028862bE2a173976CA11';

	const encodeCall = ({ selector, to, value }: { selector: string; to: string; value: bigint }) =>
		`${selector}${AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [to, value]).slice(2)}`;

	const mockContext = new Map([[SEND_CONTEXT_KEY, initSendContext({ token: ETHEREUM_TOKEN })]]);

	const props = {
		amount: ZERO,
		application: 'https://dapp.example',
		erc20Approve: false,
		erc20Transfer: false,
		sourceNetwork: ETHEREUM_NETWORK,
		onApprove: vi.fn(),
		onReject: vi.fn()
	};

	const warningTestId = 'wallet-connect-unverifiable-erc20-transfer-warning';

	beforeEach(() => {
		vi.clearAllMocks();

		erc20DefaultTokensStore.reset();
		erc20CustomTokensStore.resetAll();

		erc20DefaultTokensStore.add(USDC_TOKEN);
		erc20CustomTokensStore.setAll([{ data: { ...USDC_TOKEN, enabled: true }, certified: false }]);
	});

	it('should render the token, the decoded recipient and the decoded amount of an ERC20 transfer', () => {
		const { getByText, queryByTestId, getByRole } = render(EthWalletConnectSendReview, {
			props: {
				...props,
				data: encodeCall({
					selector: ERC20_TRANSFER_HASH,
					to: RECIPIENT,
					value: 1_500_000n
				}),
				destination: USDC_TOKEN.address,
				erc20Transfer: true
			},
			context: mockContext
		});

		expect(getByText(`1.5 ${USDC_SYMBOL}`)).toBeInTheDocument();
		expect(getByText(RECIPIENT)).toBeInTheDocument();

		expect(queryByTestId(warningTestId)).not.toBeInTheDocument();
		expect(getByRole('button', { name: en.core.text.approve })).not.toBeDisabled();
	});

	it('should never summarize an ERC20 transfer as a native zero-value send', () => {
		const { queryByText } = render(EthWalletConnectSendReview, {
			props: {
				...props,
				data: encodeCall({
					selector: ERC20_TRANSFER_HASH,
					to: RECIPIENT,
					value: 1_500_000n
				}),
				destination: USDC_TOKEN.address,
				erc20Transfer: true
			},
			context: mockContext
		});

		expect(queryByText(`0 ${ETHEREUM_TOKEN.symbol}`)).not.toBeInTheDocument();
		expect(queryByText(USDC_TOKEN.address)).not.toBeInTheDocument();
	});

	it('should warn and disable approval for an ERC20 transfer of an unknown token', () => {
		const { getByTestId, getByRole } = render(EthWalletConnectSendReview, {
			props: {
				...props,
				data: encodeCall({
					selector: ERC20_TRANSFER_HASH,
					to: RECIPIENT,
					value: 1_500_000n
				}),
				destination: UNKNOWN_CONTRACT,
				erc20Transfer: true
			},
			context: mockContext
		});

		expect(getByTestId(warningTestId)).toBeInTheDocument();
		expect(getByRole('button', { name: en.core.text.approve })).toBeDisabled();
	});

	it('should warn and disable approval for an ERC20 transfer with undecodable calldata', () => {
		const { getByTestId, getByRole } = render(EthWalletConnectSendReview, {
			props: {
				...props,
				data: `${ERC20_TRANSFER_HASH}deadbeef`,
				destination: USDC_TOKEN.address,
				erc20Transfer: true
			},
			context: mockContext
		});

		expect(getByTestId(warningTestId)).toBeInTheDocument();
		expect(getByRole('button', { name: en.core.text.approve })).toBeDisabled();
	});

	it('should keep rendering the token, the spender and the amount of an ERC20 approve', () => {
		const { getByText, queryByTestId, getByRole } = render(EthWalletConnectSendReview, {
			props: {
				...props,
				data: encodeCall({
					selector: ERC20_APPROVE_HASH,
					to: RECIPIENT,
					value: 2_000_000n
				}),
				destination: USDC_TOKEN.address,
				erc20Approve: true
			},
			context: mockContext
		});

		expect(getByText(`2 ${USDC_SYMBOL}`)).toBeInTheDocument();
		expect(getByText(en.wallet_connect.text.spender)).toBeInTheDocument();

		expect(queryByTestId(warningTestId)).not.toBeInTheDocument();
		expect(getByRole('button', { name: en.core.text.approve })).not.toBeDisabled();
	});

	it('should keep rendering a genuine native send with its value and destination', () => {
		const { getByText, queryByTestId, getByRole } = render(EthWalletConnectSendReview, {
			props: {
				...props,
				amount: 1_000_000_000_000_000_000n,
				destination: RECIPIENT
			},
			context: mockContext
		});

		expect(getByText(`1 ${ETHEREUM_TOKEN.symbol}`)).toBeInTheDocument();
		expect(getByText(RECIPIENT)).toBeInTheDocument();

		expect(queryByTestId(warningTestId)).not.toBeInTheDocument();
		expect(getByRole('button', { name: en.core.text.approve })).not.toBeDisabled();
	});
});
