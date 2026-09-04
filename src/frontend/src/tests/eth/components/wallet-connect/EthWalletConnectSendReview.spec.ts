import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { SEND_TRANSACTION_PRIORITY_ENABLED } from '$env/send-transaction-priority.env';
import { USDC_SYMBOL, USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import EthWalletConnectSendReview from '$eth/components/wallet-connect/EthWalletConnectSendReview.svelte';
import { ERC_SET_APPROVAL_FOR_ALL_HASH } from '$eth/constants/erc.constants';
import {
	ERC20_APPROVE_HASH,
	ERC20_DECREASE_ALLOWANCE_HASH,
	ERC20_INCREASE_ALLOWANCE_HASH,
	ERC20_TRANSFER_HASH
} from '$eth/constants/erc20.constants';
import { ETH_BASE_FEE } from '$eth/constants/eth.constants';
import { MULTICALL_HASH } from '$eth/constants/multicall.constants';
import { erc20CustomTokensStore } from '$eth/stores/erc20-custom-tokens.store';
import { erc20DefaultTokensStore } from '$eth/stores/erc20-default-tokens.store';
import {
	ETH_FEE_CONTEXT_KEY,
	initEthFeeContext,
	initEthFeeStore,
	type EthFeeStore
} from '$eth/stores/eth-fee.store';
import type { EthFeePriorities } from '$eth/types/fee';
import type { WalletConnectEthCall } from '$eth/types/wallet-connect';
import { classifyWalletConnectEthCall } from '$eth/utils/wallet-connect.utils';
import { MAX_UINT_256, ZERO } from '$lib/constants/app.constants';
import {
	CONVERT_AMOUNT_EXCHANGE_VALUE,
	ETH_FEE_PRIORITY,
	ETH_FEE_PRIORITY_OPTION
} from '$lib/constants/test-ids.constants';
import { EthFeePriority as Priority } from '$lib/enums/eth-fee-priority';
import { screensStore } from '$lib/stores/screens.store';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import en from '$tests/mocks/i18n.mock';
import { isNullish } from '@dfinity/utils';
import { fireEvent, render, within } from '@testing-library/svelte';
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
		// The classifier is what decides which review the request gets, so every case below routes
		// through it rather than asserting a branch the production code might never reach.
		call: classifyWalletConnectEthCall(undefined),
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
		const data = encodeCall({ selector: ERC20_TRANSFER_HASH, to: RECIPIENT, value: 1_500_000n });

		const { getByText, queryByTestId, getByRole } = render(EthWalletConnectSendReview, {
			props: {
				...props,
				call: classifyWalletConnectEthCall(data),
				data,
				destination: USDC_TOKEN.address
			},
			context: mockContext
		});

		expect(getByText(`1.5 ${USDC_SYMBOL}`)).toBeInTheDocument();
		expect(getByText(RECIPIENT)).toBeInTheDocument();

		expect(queryByTestId(warningTestId)).not.toBeInTheDocument();
		expect(getByRole('button', { name: en.core.text.approve })).not.toBeDisabled();
	});

	// The signer is the wallet the request was sent to, which the user opened to read this. It says
	// nothing about the request and takes a row from the facts that do.
	it('should not render the signer row', () => {
		const { queryByText, container } = render(EthWalletConnectSendReview, {
			props: {
				...props,
				destination: UNKNOWN_CONTRACT
			},
			context: mockContext
		});

		expect(queryByText(en.wallet_connect.text.signer)).not.toBeInTheDocument();
		expect(container.querySelector('#signer')).toBeNull();
	});

	it('should never summarize an ERC20 transfer as a native zero-value send', () => {
		const data = encodeCall({ selector: ERC20_TRANSFER_HASH, to: RECIPIENT, value: 1_500_000n });

		const { queryByText } = render(EthWalletConnectSendReview, {
			props: {
				...props,
				call: classifyWalletConnectEthCall(data),
				data,
				destination: USDC_TOKEN.address
			},
			context: mockContext
		});

		expect(queryByText(`0 ${ETHEREUM_TOKEN.symbol}`)).not.toBeInTheDocument();
		expect(queryByText(USDC_TOKEN.address)).not.toBeInTheDocument();
	});

	// The classifier decides whether the review enters its ERC20 branch at all, so it is wired in
	// here rather than assumed: a selector that differs only in casing is the same call to the same
	// contract, and used to leave every protection below dormant.
	it.each([ERC20_TRANSFER_HASH, ERC20_TRANSFER_HASH.toUpperCase().replace('0X', '0x')])(
		'should describe a transfer sent with selector %s',
		(selector) => {
			const data = encodeCall({ selector, to: RECIPIENT, value: 1_500_000n });

			const { getByText, queryByText, queryByTestId, getByRole } = render(
				EthWalletConnectSendReview,
				{
					props: {
						...props,
						data,
						destination: USDC_TOKEN.address,
						call: classifyWalletConnectEthCall(data)
					},
					context: mockContext
				}
			);

			expect(getByText(`1.5 ${USDC_SYMBOL}`)).toBeInTheDocument();
			expect(getByText(RECIPIENT)).toBeInTheDocument();

			// The shape the report described: a token transfer wearing a native zero-value send.
			expect(queryByText(`0 ${ETHEREUM_TOKEN.symbol}`)).not.toBeInTheDocument();

			expect(queryByTestId(warningTestId)).not.toBeInTheDocument();
			expect(getByRole('button', { name: en.core.text.approve })).not.toBeDisabled();
		}
	);

	it('should warn and disable approval for a mixed-case transfer whose arguments do not decode', () => {
		const data = `${ERC20_TRANSFER_HASH.toUpperCase().replace('0X', '0x')}deadbeef`;

		const { getByTestId, getByRole } = render(EthWalletConnectSendReview, {
			props: {
				...props,
				data,
				destination: USDC_TOKEN.address,
				call: classifyWalletConnectEthCall(data)
			},
			context: mockContext
		});

		expect(getByTestId(warningTestId)).toBeInTheDocument();
		expect(getByRole('button', { name: en.core.text.approve })).toBeDisabled();
	});

	it('should warn and disable approval for an ERC20 transfer of an unknown token', () => {
		const data = encodeCall({ selector: ERC20_TRANSFER_HASH, to: RECIPIENT, value: 1_500_000n });

		const { getByTestId, getByRole } = render(EthWalletConnectSendReview, {
			props: {
				...props,
				call: classifyWalletConnectEthCall(data),
				data,
				destination: UNKNOWN_CONTRACT
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
				call: classifyWalletConnectEthCall(`${ERC20_TRANSFER_HASH}deadbeef`),
				data: `${ERC20_TRANSFER_HASH}deadbeef`,
				destination: USDC_TOKEN.address
			},
			context: mockContext
		});

		expect(getByTestId(warningTestId)).toBeInTheDocument();
		expect(getByRole('button', { name: en.core.text.approve })).toBeDisabled();
	});

	it('should keep rendering the token, the spender and the amount of an ERC20 approve', () => {
		const data = encodeCall({ selector: ERC20_APPROVE_HASH, to: RECIPIENT, value: 2_000_000n });

		const { getByText, queryByTestId, getByRole } = render(EthWalletConnectSendReview, {
			props: {
				...props,
				call: classifyWalletConnectEthCall(data),
				data,
				destination: USDC_TOKEN.address
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
					call: classifyWalletConnectEthCall(data),
					data,
					destination: COLLECTION
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

	describe('increaseAllowance / decreaseAllowance', () => {
		const SPENDER = '0x1F98431c8aD98523631AE4a59f267346ea31F984';

		const deltaTestId = 'wallet-connect-allowance-delta';

		const renderAllowanceDelta = ({
			selector,
			value,
			destination = USDC_TOKEN.address
		}: {
			selector: string;
			value: bigint;
			destination?: string;
		}) => {
			const data = encodeCall({ selector, to: SPENDER, value });

			return render(EthWalletConnectSendReview, {
				props: { ...props, call: classifyWalletConnectEthCall(data), data, destination },
				context: mockContext
			});
		};

		// The report: `increaseAllowance` was recognised by nothing, so the review described a
		// zero-value send of ETH to the token contract while the calldata granted an allowance.
		it('should never summarize an allowance increase as a native zero-value send', () => {
			const { queryByText, getByText } = renderAllowanceDelta({
				selector: ERC20_INCREASE_ALLOWANCE_HASH,
				value: MAX_UINT_256
			});

			expect(queryByText(`0 ${ETHEREUM_TOKEN.symbol}`)).not.toBeInTheDocument();
			expect(queryByText(USDC_TOKEN.address)).toBeInTheDocument();
			expect(getByText(en.wallet_connect.text.spender)).toBeInTheDocument();
			expect(getByText(SPENDER)).toBeInTheDocument();
		});

		it('should name the token and call an unlimited increase unlimited', () => {
			const { getByText, getByTestId } = renderAllowanceDelta({
				selector: ERC20_INCREASE_ALLOWANCE_HASH,
				value: MAX_UINT_256
			});

			expect(getByText(`Unlimited ${USDC_SYMBOL}`)).toBeInTheDocument();
			expect(getByTestId(deltaTestId)).toHaveTextContent(en.wallet_connect.text.allowance_increase);
		});

		it('should render the decoded delta of a bounded increase', () => {
			const { getByText } = renderAllowanceDelta({
				selector: ERC20_INCREASE_ALLOWANCE_HASH,
				value: 2_000_000n
			});

			expect(getByText(`2 ${USDC_SYMBOL}`)).toBeInTheDocument();
		});

		it('should describe a decrease as a decrease rather than as a grant', () => {
			const { getByTestId } = renderAllowanceDelta({
				selector: ERC20_DECREASE_ALLOWANCE_HASH,
				value: 2_000_000n
			});

			expect(getByTestId(deltaTestId)).toHaveTextContent(en.wallet_connect.text.allowance_decrease);
		});

		it('should warn and disable approval for an allowance delta on an unknown token', () => {
			const { getByTestId, getByRole } = renderAllowanceDelta({
				selector: ERC20_INCREASE_ALLOWANCE_HASH,
				value: MAX_UINT_256,
				destination: UNKNOWN_CONTRACT
			});

			expect(getByTestId(warningTestId)).toBeInTheDocument();
			expect(getByRole('button', { name: en.core.text.approve })).toBeDisabled();
		});

		it('should warn and disable approval when the spender cannot be decoded', () => {
			const data = `${ERC20_INCREASE_ALLOWANCE_HASH}deadbeef`;

			const { getByTestId, getByRole } = render(EthWalletConnectSendReview, {
				props: {
					...props,
					call: classifyWalletConnectEthCall(data),
					data,
					destination: USDC_TOKEN.address
				},
				context: mockContext
			});

			expect(getByTestId(warningTestId)).toBeInTheDocument();
			expect(getByRole('button', { name: en.core.text.approve })).toBeDisabled();
		});
	});

	describe('calldata OISY cannot read', () => {
		// Uniswap Permit2 `approve`, one of the selectors that would have been the next report.
		const PERMIT2_APPROVE_HASH = '0x87517c45';

		const unknownTestId = 'wallet-connect-unknown-call';

		const renderUnknownCall = ({ data, amount = ZERO }: { data: string; amount?: bigint }) =>
			render(EthWalletConnectSendReview, {
				props: {
					...props,
					amount,
					call: classifyWalletConnectEthCall(data),
					data,
					destination: UNKNOWN_CONTRACT
				},
				context: mockContext
			});

		// The whole point of the change: this must hold for every selector nobody has considered,
		// not only for the ones that have been reported.
		it('should never summarize an unreadable call as a native zero-value send', () => {
			const { queryByText, getByTestId } = renderUnknownCall({
				data: `${PERMIT2_APPROVE_HASH}deadbeef`
			});

			expect(queryByText(`0 ${ETHEREUM_TOKEN.symbol}`)).not.toBeInTheDocument();
			expect(queryByText(en.core.text.amount)).not.toBeInTheDocument();
			expect(queryByText(en.send.text.balance)).not.toBeInTheDocument();

			expect(getByTestId(unknownTestId)).toHaveTextContent(en.wallet_connect.text.unknown_call);
		});

		it('should name the function it could not decode', async () => {
			const { getByText, getByRole } = renderUnknownCall({
				data: `${PERMIT2_APPROVE_HASH}deadbeef`
			});

			await fireEvent.click(getByRole('button', { name: en.wallet_connect.text.tab_raw_data }));

			expect(getByText(en.wallet_connect.text.methods)).toBeInTheDocument();
			expect(getByText(PERMIT2_APPROVE_HASH)).toBeInTheDocument();
		});

		it('should treat calldata too short to carry a selector as unreadable, and name none', async () => {
			const { getByTestId, getByText, getByRole } = renderUnknownCall({ data: '0xab' });

			expect(getByTestId(unknownTestId)).toBeInTheDocument();

			await fireEvent.click(getByRole('button', { name: en.wallet_connect.text.tab_raw_data }));

			expect(getByText(en.wallet_connect.text.method_without_selector)).toBeInTheDocument();
		});

		// A batch names its own wrapper and nothing else, so the wrapper alone answers "what does
		// this call?" with a name that describes neither the approve nor the swap inside it.
		// Depth is what the list indents by, so a call two levels down must not sit at the same
		// indent as a direct member of the wrapper.
		it('should indent a batched call by how deep it actually sits', async () => {
			const inner = encodeCall({
				selector: ERC20_APPROVE_HASH,
				to: RECIPIENT,
				value: MAX_UINT_256
			});

			const nested = `${MULTICALL_HASH}${AbiCoder.defaultAbiCoder()
				.encode(['bytes[]'], [[inner]])
				.slice(2)}`;

			const data = `${MULTICALL_HASH}${AbiCoder.defaultAbiCoder()
				.encode(['bytes[]'], [[nested]])
				.slice(2)}`;

			const { getByRole, container } = renderUnknownCall({ data });

			await fireEvent.click(getByRole('button', { name: en.wallet_connect.text.tab_raw_data }));

			const indents = [...container.querySelectorAll('#methods li')].map(
				(li) => (li as HTMLElement).style.paddingLeft
			);

			expect(indents).toEqual(['0rem', '1rem', '2rem']);
		});

		it('should list the calls batched inside a multicall, not only the wrapper', async () => {
			const inner = [
				encodeCall({ selector: ERC20_APPROVE_HASH, to: RECIPIENT, value: MAX_UINT_256 }),
				encodeCall({ selector: PERMIT2_APPROVE_HASH, to: RECIPIENT, value: 1n })
			];

			const data = `${MULTICALL_HASH}${AbiCoder.defaultAbiCoder()
				.encode(['bytes[]'], [inner])
				.slice(2)}`;

			const { getByText, getByRole } = renderUnknownCall({ data });

			await fireEvent.click(getByRole('button', { name: en.wallet_connect.text.tab_raw_data }));

			expect(getByText(MULTICALL_HASH)).toBeInTheDocument();
			expect(getByText(ERC20_APPROVE_HASH)).toBeInTheDocument();
			expect(getByText(PERMIT2_APPROVE_HASH)).toBeInTheDocument();
		});

		it('should still show native value an unreadable call carries alongside it', () => {
			const { getByText } = renderUnknownCall({
				data: `${PERMIT2_APPROVE_HASH}deadbeef`,
				amount: 1_000_000_000_000_000_000n
			});

			expect(getByText(`1 ${ETHEREUM_TOKEN.symbol}`)).toBeInTheDocument();
		});

		// The warning states what OISY could not establish; it does not withhold the decision. Blocking
		// every selector OISY has never decoded would take most dApps offline, so approval stays with
		// the user and the review stops misdescribing what they are deciding on.
		it('should warn without disabling approval', () => {
			const { getByTestId, getByRole } = renderUnknownCall({
				data: `${PERMIT2_APPROVE_HASH}deadbeef`
			});

			expect(getByTestId(unknownTestId)).toBeInTheDocument();
			expect(getByRole('button', { name: en.core.text.approve })).not.toBeDisabled();
		});

		// A warning the user has to go looking for is one they can miss. Every message box sits above
		// the tabs, so switching to the raw data does not take the warning off the screen.
		it('should keep the warning visible on both tabs', async () => {
			const { getByTestId, getByRole } = renderUnknownCall({
				data: `${PERMIT2_APPROVE_HASH}deadbeef`
			});

			expect(getByTestId(unknownTestId)).toBeInTheDocument();

			await fireEvent.click(getByRole('button', { name: en.wallet_connect.text.tab_raw_data }));

			expect(getByTestId(unknownTestId)).toBeInTheDocument();
		});

		it('should not warn about a request that carries no calldata at all', () => {
			const { queryByTestId, getByRole } = render(EthWalletConnectSendReview, {
				props: {
					...props,
					amount: 1_000_000_000_000_000_000n,
					call: classifyWalletConnectEthCall('0x'),
					data: '0x',
					destination: RECIPIENT
				},
				context: mockContext
			});

			expect(queryByTestId(unknownTestId)).not.toBeInTheDocument();
			expect(getByRole('button', { name: en.core.text.approve })).not.toBeDisabled();
		});
	});

	describe('transaction priority', () => {
		// No base fee, so each option prices at exactly its own tip times the gas limit. That keeps
		// the arithmetic below legible without depending on how a currency is formatted. The ceiling
		// has to clear every tip, or all three collapse onto it and stop being distinguishable.
		const CEILING_PER_GAS = 100_000_000_000n;

		const priorities: EthFeePriorities = {
			baseFeePerGas: ZERO,
			perPriority: {
				[Priority.SLOW]: { maxFeePerGas: CEILING_PER_GAS, maxPriorityFeePerGas: 1_000_000_000n },
				[Priority.STANDARD]: {
					maxFeePerGas: CEILING_PER_GAS,
					maxPriorityFeePerGas: 2_000_000_000n
				},
				[Priority.FAST]: { maxFeePerGas: CEILING_PER_GAS, maxPriorityFeePerGas: 4_000_000_000n }
			}
		};

		// The option rows quote fiat only, so without a rate they render empty and prove nothing.
		const exchangeRate = 2_000;

		const renderRow = ({
			requestedGas,
			gas = estimatedGas,
			call = props.call
		}: {
			requestedGas?: bigint;
			gas?: bigint;
			call?: WalletConnectEthCall;
		}) => {
			const feeStore = initEthFeeStore();

			// Mirror what `EthFeeContext` puts in the store once a tier is selected, so the fee row and
			// the option rows are pricing the same thing and can be compared.
			feeStore.setFee({
				...priorities.perPriority[Priority.STANDARD],
				baseFeePerGas: priorities.baseFeePerGas,
				gas
			});

			const feeContext = initEthFeeContext({
				feeStore,
				feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals),
				feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
				feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
				feeExchangeRateStore: writable(exchangeRate)
			});

			feeContext.feePrioritiesStore.set(priorities);

			return render(EthWalletConnectSendReview, {
				props: {
					...props,
					amount: 1_000_000_000_000_000_000n,
					call,
					destination: RECIPIENT,
					requestedGas
				},
				context: new Map<symbol, unknown>([
					[SEND_CONTEXT_KEY, initSendContext({ token: ETHEREUM_TOKEN })],
					[ETH_FEE_CONTEXT_KEY, feeContext]
				])
			});
		};

		// Two renders coexist in the document when a test compares them, so every query below is
		// scoped to its own render rather than to the shared body.
		const normalOptionFiat = ({ container }: ReturnType<typeof renderRow>): string => {
			const row = within(container)
				.getByTestId(`${ETH_FEE_PRIORITY_OPTION}-${Priority.STANDARD}`)
				.closest('label');

			expect(row).not.toBeNull();

			return within(row as HTMLLabelElement).getByTestId(CONVERT_AMOUNT_EXCHANGE_VALUE)
				.textContent as string;
		};

		beforeEach(() => {
			// Large screens expand the options in place, so they are in the DOM without opening a sheet.
			screensStore.set('lg');
		});

		it('should offer the choice when the network reports one', () => {
			const { getByTestId } = renderRow({});

			expect(getByTestId(ETH_FEE_PRIORITY)).toBeInTheDocument();
		});

		it('should price the options on the gas limit the dApp requested', () => {
			// Same limit, reached two different ways: once because the dApp asked for it, once because
			// it is what OISY resolved. Priced on the signed limit, both render the same amount.
			expect(normalOptionFiat(renderRow({ requestedGas: 2_000_000n }))).toBe(
				normalOptionFiat(renderRow({ gas: 2_000_000n }))
			);
		});

		it('should not price the options on the estimate when the request carries its own limit', () => {
			expect(normalOptionFiat(renderRow({ requestedGas: 2_000_000n }))).not.toBe(
				normalOptionFiat(renderRow({}))
			);
		});

		it('should quote the selected tier at the same amount as the fee row beneath it', () => {
			// The fee row prices the signed limit through `EthFeeDisplay`; the option prices it through
			// the priority row. A disagreement between the two is the bug this pairing exists to catch.
			const result = renderRow({ requestedGas: 2_000_000n });

			expect(
				within(result.container).getByText(`0.004 ${ETHEREUM_TOKEN.symbol}`)
			).toBeInTheDocument();

			// Every option quotes fiat inside its own label, so the one outside them all is the fee
			// row's. Matching on that rather than on a class keeps the test off the styling.
			const outsideAnOption = within(result.container)
				.getAllByTestId(CONVERT_AMOUNT_EXCHANGE_VALUE)
				.filter((element) => isNullish(element.closest('label')));

			expect(outsideAnOption).toHaveLength(1);

			expect(normalOptionFiat(result)).toBe(outsideAnOption[0].textContent);
		});

		it.each([
			{
				request: 'an approval',
				data: encodeCall({ selector: ERC20_APPROVE_HASH, to: RECIPIENT, value: MAX_UINT_256 })
			},
			{ request: 'a call it could not decode', data: `${MULTICALL_HASH}dead` }
		])('should offer the choice on $request, which pays gas like any other', ({ data }) => {
			const { getByTestId } = renderRow({ call: classifyWalletConnectEthCall(data) });

			expect(getByTestId(ETH_FEE_PRIORITY)).toBeInTheDocument();
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

			// The label follows the feature flag: the request quotes an expected cost only where the
			// priority work is enabled. max_fee_eth contains HTML, so match its plain-text fragment.
			expect(
				getByText(SEND_TRANSACTION_PRIORITY_ENABLED ? en.fee.text.estimated_fee_eth : 'Max fee')
			).toBeInTheDocument();

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
