import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import HarvestStakeReview from '$eth/components/stake/harvest-autopilot/HarvestStakeReview.svelte';
import { ETH_FEE_CONTEXT_KEY, initEthFeeContext, initEthFeeStore } from '$eth/stores/eth-fee.store';
import { STAKE_REVIEW_FORM_BUTTON } from '$lib/constants/test-ids.constants';
import * as exchanges from '$lib/derived/exchange.derived';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import type { Vault } from '$lib/types/vaults';
import { mockValidErc4626Token } from '$tests/mocks/erc4626-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { readable, writable } from 'svelte/store';

describe('HarvestStakeReview', () => {
	const mockVaultToken = {
		...mockValidErc4626Token,
		network: ETHEREUM_NETWORK,
		enabled: true
	};

	const mockVault: Vault = {
		token: mockVaultToken,
		apy: '5.5'
	};

	const mockFeeStoreValues = {
		maxFeePerGas: 1000n,
		maxGasFee: 1000n,
		gas: 1000n,
		maxPriorityFeePerGas: 1000n
	};

	const mockExchange = () =>
		vi.spyOn(exchanges, 'exchanges', 'get').mockImplementation(() => readable({}));

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
		vault: mockVault,
		onBack: vi.fn(),
		onClose: vi.fn(),
		onStake: vi.fn()
	};

	beforeEach(() => {
		vi.resetAllMocks();
		mockExchange();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should render the stake now button', () => {
		const { getByTestId } = render(HarvestStakeReview, {
			props,
			context: buildContext()
		});

		expect(getByTestId(STAKE_REVIEW_FORM_BUTTON)).toBeInTheDocument();
		expect(getByTestId(STAKE_REVIEW_FORM_BUTTON)).toHaveTextContent(en.stake.text.stake_now);
	});

	it('should enable the confirm button when amount is valid', () => {
		const { getByTestId } = render(HarvestStakeReview, {
			props,
			context: buildContext()
		});

		expect(getByTestId(STAKE_REVIEW_FORM_BUTTON)).not.toHaveAttribute('disabled');
	});

	it('should disable the confirm button when amount is undefined', () => {
		const { getByTestId } = render(HarvestStakeReview, {
			props: { ...props, amount: undefined },
			context: buildContext()
		});

		expect(getByTestId(STAKE_REVIEW_FORM_BUTTON)).toHaveAttribute('disabled');
	});

	it('should disable the confirm button when amount is zero', () => {
		const { getByTestId } = render(HarvestStakeReview, {
			props: { ...props, amount: 0 },
			context: buildContext()
		});

		expect(getByTestId(STAKE_REVIEW_FORM_BUTTON)).toHaveAttribute('disabled');
	});

	it('should render the review subtitle', () => {
		const { getByText } = render(HarvestStakeReview, {
			props,
			context: buildContext()
		});

		expect(getByText(en.stake.text.stake_review_subtitle)).toBeInTheDocument();
	});

	it('should render the network label', () => {
		const { getByText } = render(HarvestStakeReview, {
			props,
			context: buildContext()
		});

		expect(getByText(en.send.text.network)).toBeInTheDocument();
	});

	it('should render HarvestStakeFees', () => {
		const { getByText } = render(HarvestStakeReview, {
			props,
			context: buildContext()
		});

		expect(getByText(en.fee.text.network_fee)).toBeInTheDocument();
	});

	it('should call onBack when back button is clicked', async () => {
		const onBack = vi.fn();

		const { getByText } = render(HarvestStakeReview, {
			props: { ...props, onBack },
			context: buildContext()
		});

		await fireEvent.click(getByText(en.core.text.back));

		expect(onBack).toHaveBeenCalledOnce();
	});

	it('should call onStake when confirm button is clicked', async () => {
		const onStake = vi.fn();

		const { getByTestId } = render(HarvestStakeReview, {
			props: { ...props, onStake },
			context: buildContext()
		});

		await fireEvent.click(getByTestId(STAKE_REVIEW_FORM_BUTTON));

		expect(onStake).toHaveBeenCalledOnce();
	});
});
