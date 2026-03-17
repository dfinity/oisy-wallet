import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import HarvestUnstakeReview from '$eth/components/stake/harvest-autopilot/HarvestUnstakeReview.svelte';
import { ETH_FEE_CONTEXT_KEY, initEthFeeContext, initEthFeeStore } from '$eth/stores/eth-fee.store';
import { STAKE_REVIEW_FORM_BUTTON } from '$lib/constants/test-ids.constants';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import { mockValidErc4626Token } from '$tests/mocks/erc4626-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { writable } from 'svelte/store';

describe('HarvestUnstakeReview', () => {
	const mockVaultToken = {
		...mockValidErc4626Token,
		network: ETHEREUM_NETWORK,
		enabled: true
	};

	const mockFeeStoreValues = {
		maxFeePerGas: 1000n,
		maxGasFee: 1000n,
		gas: 1000n,
		maxPriorityFeePerGas: 1000n
	};

	const buildContext = ({ token = mockVaultToken }: { token?: typeof mockVaultToken } = {}) => {
		const feeStore = initEthFeeStore();
		feeStore.setFee(mockFeeStoreValues);

		const context = new Map([]);
		context.set(SEND_CONTEXT_KEY, initSendContext({ token }));
		context.set(
			ETH_FEE_CONTEXT_KEY,
			initEthFeeContext({
				feeStore,
				feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
				feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
				feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals)
			})
		);

		return context;
	};

	const props = {
		amount: 0.01,
		onBack: vi.fn(),
		onClose: vi.fn(),
		onUnstake: vi.fn()
	};

	beforeEach(() => {
		vi.resetAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should render the unstake now button', () => {
		const { getByTestId } = render(HarvestUnstakeReview, {
			props,
			context: buildContext()
		});

		expect(getByTestId(STAKE_REVIEW_FORM_BUTTON)).toBeInTheDocument();
		expect(getByTestId(STAKE_REVIEW_FORM_BUTTON)).toHaveTextContent(en.stake.text.unstake_now);
	});

	it('should enable the confirm button when amount is valid', () => {
		const { getByTestId } = render(HarvestUnstakeReview, {
			props,
			context: buildContext()
		});

		expect(getByTestId(STAKE_REVIEW_FORM_BUTTON)).not.toHaveAttribute('disabled');
	});

	it('should disable the confirm button when amount is undefined', () => {
		const { getByTestId } = render(HarvestUnstakeReview, {
			props: { ...props, amount: undefined },
			context: buildContext()
		});

		expect(getByTestId(STAKE_REVIEW_FORM_BUTTON)).toHaveAttribute('disabled');
	});

	it('should disable the confirm button when amount is zero', () => {
		const { getByTestId } = render(HarvestUnstakeReview, {
			props: { ...props, amount: 0 },
			context: buildContext()
		});

		expect(getByTestId(STAKE_REVIEW_FORM_BUTTON)).toHaveAttribute('disabled');
	});

	it('should render the review subtitle', () => {
		const { getByText } = render(HarvestUnstakeReview, {
			props,
			context: buildContext()
		});

		expect(getByText(en.stake.text.unstake_review_subtitle)).toBeInTheDocument();
	});

	it('should render the network label', () => {
		const { getByText } = render(HarvestUnstakeReview, {
			props,
			context: buildContext()
		});

		expect(getByText(en.send.text.network)).toBeInTheDocument();
	});

	it('should render HarvestStakeFees', () => {
		const { getByText } = render(HarvestUnstakeReview, {
			props,
			context: buildContext()
		});

		expect(getByText(en.fee.text.network_fee)).toBeInTheDocument();
	});

	it('should call onBack when back button is clicked', async () => {
		const onBack = vi.fn();

		const { getByText } = render(HarvestUnstakeReview, {
			props: { ...props, onBack },
			context: buildContext()
		});

		await fireEvent.click(getByText(en.core.text.back));

		expect(onBack).toHaveBeenCalledOnce();
	});

	it('should call onUnstake when confirm button is clicked', async () => {
		const onUnstake = vi.fn();

		const { getByTestId } = render(HarvestUnstakeReview, {
			props: { ...props, onUnstake },
			context: buildContext()
		});

		await fireEvent.click(getByTestId(STAKE_REVIEW_FORM_BUTTON));

		expect(onUnstake).toHaveBeenCalledOnce();
	});
});
