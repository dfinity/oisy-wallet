import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN, ETHEREUM_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import HarvestUnstakeForm from '$eth/components/stake/harvest-autopilot/HarvestUnstakeForm.svelte';
import { ETH_FEE_CONTEXT_KEY, initEthFeeContext, initEthFeeStore } from '$eth/stores/eth-fee.store';
import { STAKE_FORM_REVIEW_BUTTON } from '$lib/constants/test-ids.constants';
import * as exchanges from '$lib/derived/exchange.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import { mockValidErc4626Token } from '$tests/mocks/erc4626-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { readable, writable } from 'svelte/store';

describe('HarvestUnstakeForm', () => {
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

	const sufficientNativeBalance = 1000000000000000000n;
	const sufficientSendBalance = 1000000000000000000n;

	const mockExchange = () =>
		vi.spyOn(exchanges, 'exchanges', 'get').mockImplementation(() => readable({}));

	const buildContext = ({
		token = mockVaultToken,
		feeLoaded = true,
		customSendBalance
	}: {
		token?: typeof mockVaultToken;
		feeLoaded?: boolean;
		customSendBalance?: bigint;
	} = {}) => {
		const feeStore = initEthFeeStore();
		if (feeLoaded) {
			feeStore.setFee(mockFeeStoreValues);
		}

		const context = new Map([]);
		context.set(
			SEND_CONTEXT_KEY,
			initSendContext({
				token,
				...(customSendBalance !== undefined ? { customSendBalance } : {})
			})
		);
		context.set(
			ETH_FEE_CONTEXT_KEY,
			initEthFeeContext({
				feeStore,
				feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
				feeTokenIdStore: writable(ETHEREUM_TOKEN_ID),
				feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals)
			})
		);

		return context;
	};

	const props = {
		amount: 0.01,
		onClose: vi.fn(),
		onNext: vi.fn()
	};

	beforeEach(() => {
		vi.resetAllMocks();
		mockExchange();

		balancesStore.set({
			id: ETHEREUM_TOKEN_ID,
			data: { data: sufficientNativeBalance, certified: false }
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();

		balancesStore.reset(ETHEREUM_TOKEN_ID);
	});

	it('should enable the review button when fee is loaded and amount is valid', () => {
		const { getByTestId } = render(HarvestUnstakeForm, {
			props,
			context: buildContext({ customSendBalance: sufficientSendBalance })
		});

		expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).not.toHaveAttribute('disabled');
	});

	it('should disable the review button when fee is not loaded', () => {
		const { getByTestId } = render(HarvestUnstakeForm, {
			props,
			context: buildContext({ feeLoaded: false })
		});

		expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).toHaveAttribute('disabled');
	});

	it('should disable the review button when amount is undefined', () => {
		const { getByTestId } = render(HarvestUnstakeForm, {
			props: { ...props, amount: undefined },
			context: buildContext()
		});

		expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).toHaveAttribute('disabled');
	});

	it('should disable the review button when native balance is insufficient for fee', async () => {
		balancesStore.set({
			id: ETHEREUM_TOKEN_ID,
			data: { data: 100n, certified: false }
		});

		const { getByTestId } = render(HarvestUnstakeForm, {
			props,
			context: buildContext({ customSendBalance: sufficientSendBalance })
		});

		await waitFor(() => expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).toHaveAttribute('disabled'));
	});

	it('should not disable the review button when native balance covers gas fee', () => {
		const { getByTestId } = render(HarvestUnstakeForm, {
			props,
			context: buildContext({ customSendBalance: sufficientSendBalance })
		});

		expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).not.toHaveAttribute('disabled');
	});

	it('should call onClose when cancel button is clicked', async () => {
		const onClose = vi.fn();

		const { getByText } = render(HarvestUnstakeForm, {
			props: { ...props, onClose },
			context: buildContext()
		});

		await fireEvent.click(getByText(en.core.text.cancel));

		expect(onClose).toHaveBeenCalledOnce();
	});
});
