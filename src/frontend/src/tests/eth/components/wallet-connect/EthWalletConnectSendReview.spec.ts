import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { USDC_SYMBOL, USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import EthWalletConnectSendReview from '$eth/components/wallet-connect/EthWalletConnectSendReview.svelte';
import { ERC_SET_APPROVAL_FOR_ALL_HASH } from '$eth/constants/erc.constants';
import { ERC20_APPROVE_HASH, ERC20_TRANSFER_HASH } from '$eth/constants/erc20.constants';
import { ETH_BASE_FEE } from '$eth/constants/eth.constants';
import { erc20CustomTokensStore } from '$eth/stores/erc20-custom-tokens.store';
import { erc20DefaultTokensStore } from '$eth/stores/erc20-default-tokens.store';
import {
	ETH_FEE_CONTEXT_KEY,
	initEthFeeContext,
	initEthFeeStore,
	type EthFeeStore
} from '$eth/stores/eth-fee.store';
import { ZERO } from '$lib/constants/app.constants';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { AbiCoder } from 'ethers/abi';
import { writable } from 'svelte/store';

describe('EthWalletConnectSendReview', () => {
	const RECIPIENT = '0x96329840d29ab4ac4A324cA0B01F64EAE7aA7a6a';
	const UNKNOWN_CONTRACT = '0xcA11bde05977b3631167028862bE2a173976CA11';

	// 1 gwei per gas unit, so a gas limit renders as a max fee of that many gwei.
	const MAX_FEE_PER_GAS = 1_000_000_000n;

	const encodeCall = ({ selector, to, value }: { selector: string; to: string; value: bigint }) =>
		`${selector}${AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [to, value]).slice(2)}`;

	const encodeSetApprovalForAll = ({
		operator,
		approved
	}: {
		operator: string;
		approved: boolean;
	}) =>
		`${ERC_SET_APPROVAL_FOR_ALL_HASH}${AbiCoder.defaultAbiCoder()
			.encode(['address', 'bool'], [operator, approved])
			.slice(2)}`;

	const initFeeStore = (gas: bigint): EthFeeStore => {
		const feeStore = initEthFeeStore();

		feeStore.setFee({
			maxFeePerGas: MAX_FEE_PER_GAS,
			maxPriorityFeePerGas: 100_000_000n,
			gas
		});

		return feeStore;
	};

	// What OISY resolves for an ordinary contract interaction, above the 200_000 gas baseline floor.
	const estimatedGas = 250_000n;

	const contextWithFee = (feeStore: EthFeeStore) =>
		new Map<symbol, unknown>([
			[SEND_CONTEXT_KEY, initSendContext({ token: ETHEREUM_TOKEN })],
			[
				ETH_FEE_CONTEXT_KEY,
				initEthFeeContext({
					feeStore,
					feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals),
					feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
					feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
					feeExchangeRateStore: writable(undefined)
				})
			]
		]);

	const mockContext = contextWithFee(initFeeStore(estimatedGas));

	const props = {
		amount: ZERO,
		application: 'https://dapp.example',
		erc20Approve: false,
		erc20Transfer: false,
		setApprovalForAll: false,
		sourceNetwork: ETHEREUM_NETWORK,
		onApprove: vi.fn(),
		onReject: vi.fn()
	};

	const warningTestId = 'wallet-connect-unverifiable-erc20-warning';

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

	describe('setApprovalForAll', () => {
		const OPERATOR = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
		const COLLECTION = '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D';

		const grantTestId = 'wallet-connect-approval-for-all';
		const unverifiableTestId = 'wallet-connect-unverifiable-approval-for-all-warning';

		const renderSetApprovalForAll = ({ data, amount = ZERO }: { data: string; amount?: bigint }) =>
			render(EthWalletConnectSendReview, {
				props: {
					...props,
					amount,
					data,
					destination: COLLECTION,
					setApprovalForAll: true
				},
				context: mockContext
			});

		it('should never summarize an operator grant as a native zero-value send', () => {
			const { queryByText } = renderSetApprovalForAll({
				data: encodeSetApprovalForAll({ operator: OPERATOR, approved: true })
			});

			expect(queryByText(`0 ${ETHEREUM_TOKEN.symbol}`)).not.toBeInTheDocument();
			expect(queryByText(en.core.text.amount)).not.toBeInTheDocument();
			expect(queryByText(en.send.text.balance)).not.toBeInTheDocument();
		});

		it('should render the operator, the collection and what the grant authorizes', () => {
			const { getByText, getByTestId, getByRole } = renderSetApprovalForAll({
				data: encodeSetApprovalForAll({ operator: OPERATOR, approved: true })
			});

			expect(getByText(en.wallet_connect.text.operator)).toBeInTheDocument();
			expect(getByText(OPERATOR)).toBeInTheDocument();
			expect(getByText(COLLECTION)).toBeInTheDocument();

			expect(getByTestId(grantTestId)).toHaveTextContent(
				en.wallet_connect.text.approval_for_all_grant
			);

			expect(getByRole('button', { name: en.core.text.approve })).not.toBeDisabled();
		});

		it('should describe a revocation as a revocation rather than as a grant', () => {
			const { getByTestId } = renderSetApprovalForAll({
				data: encodeSetApprovalForAll({ operator: OPERATOR, approved: false })
			});

			expect(getByTestId(grantTestId)).toHaveTextContent(
				en.wallet_connect.text.approval_for_all_revoke
			);
		});

		it('should still show native value the grant carries alongside it', () => {
			const { getByText } = renderSetApprovalForAll({
				data: encodeSetApprovalForAll({ operator: OPERATOR, approved: true }),
				amount: 1_000_000_000_000_000_000n
			});

			expect(getByText(`1 ${ETHEREUM_TOKEN.symbol}`)).toBeInTheDocument();
		});

		it('should warn and disable approval when the operator cannot be decoded', () => {
			const { getByTestId, queryByTestId, getByRole } = renderSetApprovalForAll({
				data: `${ERC_SET_APPROVAL_FOR_ALL_HASH}deadbeef`
			});

			expect(getByTestId(unverifiableTestId)).toBeInTheDocument();
			expect(queryByTestId(grantTestId)).not.toBeInTheDocument();

			expect(getByRole('button', { name: en.core.text.approve })).toBeDisabled();
		});
	});

	describe('maximum fee', () => {
		const noticeTestId = 'wallet-connect-dapp-gas-limit';
		const warningTestId = 'wallet-connect-high-gas-limit';

		const renderWithGas = ({
			requestedGas,
			gas = estimatedGas
		}: {
			requestedGas?: bigint;
			gas?: bigint;
		}) =>
			render(EthWalletConnectSendReview, {
				props: {
					...props,
					amount: 1_000_000_000_000_000_000n,
					destination: RECIPIENT,
					requestedGas
				},
				context: contextWithFee(initFeeStore(gas))
			});

		it('should price the maximum fee on the gas limit the dApp requested, not on the estimate', () => {
			const { getByText, queryByText } = renderWithGas({ requestedGas: 2_000_000n });

			// en.fee.text.max_fee_eth contains HTML, so for simplicity we just search for a hardcoded string
			expect(getByText('Max fee')).toBeInTheDocument();

			// 2_000_000 gas at 1 gwei, against the 250_000 gas OISY resolved for the same transaction
			expect(getByText(`0.002 ${ETHEREUM_TOKEN.symbol}`)).toBeInTheDocument();
			expect(queryByText(`0.00025 ${ETHEREUM_TOKEN.symbol}`)).not.toBeInTheDocument();
		});

		it('should price the maximum fee on the estimate when the request carries no gas limit', () => {
			const { getByText, queryByTestId } = renderWithGas({});

			expect(getByText(`0.00025 ${ETHEREUM_TOKEN.symbol}`)).toBeInTheDocument();

			expect(queryByTestId(noticeTestId)).not.toBeInTheDocument();
			expect(queryByTestId(warningTestId)).not.toBeInTheDocument();
		});

		it('should say nothing about a gas limit that merely pads the estimate', () => {
			const { queryByTestId } = renderWithGas({ requestedGas: 300_000n });

			expect(queryByTestId(noticeTestId)).not.toBeInTheDocument();
			expect(queryByTestId(warningTestId)).not.toBeInTheDocument();
		});

		it('should name the dApp as the author of a limit at three times the baseline', () => {
			const { getByTestId, queryByTestId } = renderWithGas({ requestedGas: 750_000n });

			expect(getByTestId(noticeTestId)).toBeInTheDocument();
			expect(queryByTestId(warningTestId)).not.toBeInTheDocument();
		});

		it('should stay below the notice tier just under three times the baseline', () => {
			const { queryByTestId } = renderWithGas({ requestedGas: 749_999n });

			expect(queryByTestId(noticeTestId)).not.toBeInTheDocument();
			expect(queryByTestId(warningTestId)).not.toBeInTheDocument();
		});

		it('should warn about a limit at ten times the baseline', () => {
			const { getByTestId, queryByTestId } = renderWithGas({ requestedGas: 2_500_000n });

			expect(getByTestId(warningTestId)).toBeInTheDocument();
			expect(queryByTestId(noticeTestId)).not.toBeInTheDocument();
		});

		it('should stay on the notice tier just under ten times the baseline', () => {
			const { getByTestId, queryByTestId } = renderWithGas({ requestedGas: 2_499_999n });

			expect(getByTestId(noticeTestId)).toBeInTheDocument();
			expect(queryByTestId(warningTestId)).not.toBeInTheDocument();
		});

		it('should take the floor as the baseline when the estimation fell back to the base fee', () => {
			// against the 21_000 gas fallback this ordinary contract limit would be fourteen times
			// over and warn; against the 200_000 gas floor it is an unremarkable one and a half
			const { queryByTestId } = renderWithGas({ requestedGas: 300_000n, gas: ETH_BASE_FEE });

			expect(queryByTestId(noticeTestId)).not.toBeInTheDocument();
			expect(queryByTestId(warningTestId)).not.toBeInTheDocument();
		});

		it('should warn about a balance draining limit hidden behind an ordinary transfer', () => {
			const { getByText, getByTestId } = renderWithGas({ requestedGas: 30_000_000n });

			expect(getByText(`1 ${ETHEREUM_TOKEN.symbol}`)).toBeInTheDocument();
			// 30_000_000 gas at 1 gwei, thirty times what the transfer itself moves in fees
			expect(getByText(`0.03 ${ETHEREUM_TOKEN.symbol}`)).toBeInTheDocument();
			expect(getByTestId(warningTestId)).toBeInTheDocument();
		});

		it('should show the fiat value of the maximum fee', () => {
			const { getByText } = render(EthWalletConnectSendReview, {
				props: {
					...props,
					destination: RECIPIENT,
					requestedGas: 2_000_000n
				},
				context: new Map<symbol, unknown>([
					[SEND_CONTEXT_KEY, initSendContext({ token: ETHEREUM_TOKEN })],
					[
						ETH_FEE_CONTEXT_KEY,
						initEthFeeContext({
							feeStore: initFeeStore(estimatedGas),
							feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals),
							feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
							feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
							feeExchangeRateStore: writable(2_000)
						})
					]
				])
			});

			expect(getByText('~$4.00')).toBeInTheDocument();
		});
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
