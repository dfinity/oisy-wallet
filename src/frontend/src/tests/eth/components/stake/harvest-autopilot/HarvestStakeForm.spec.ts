import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN, ETHEREUM_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import HarvestStakeForm from '$eth/components/stake/harvest-autopilot/HarvestStakeForm.svelte';
import { ETH_FEE_CONTEXT_KEY, initEthFeeContext, initEthFeeStore } from '$eth/stores/eth-fee.store';
import { STAKE_FORM_REVIEW_BUTTON } from '$lib/constants/test-ids.constants';
import * as exchanges from '$lib/derived/exchange.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import type { Vault } from '$lib/types/vaults';
import { mockValidErc4626Token } from '$tests/mocks/erc4626-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { readable, writable } from 'svelte/store';

describe('HarvestStakeForm', () => {
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
		vault: mockVault,
		onClose: vi.fn(),
		onNext: vi.fn()
	};

	beforeEach(() => {
		vi.resetAllMocks();
		mockExchange();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should disable the review button by default because agreement is not checked', () => {
		const { getByTestId } = render(HarvestStakeForm, {
			props,
			context: buildContext()
		});

		expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).toHaveAttribute('disabled');
	});

	it('should disable the review button when fee is not loaded', () => {
		const { getByTestId } = render(HarvestStakeForm, {
			props,
			context: buildContext({ feeLoaded: false })
		});

		expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).toHaveAttribute('disabled');
	});

	it('should enable the review button when agreement is checked and fee is loaded', async () => {
		balancesStore.set({
			id: ETHEREUM_TOKEN_ID,
			data: { data: 1000000000000000000n, certified: false }
		});

		const { getByTestId, getByRole } = render(HarvestStakeForm, {
			props,
			context: buildContext({ customSendBalance: 1000000000000000000n })
		});

		const checkbox = getByRole('checkbox') as HTMLInputElement;
		await fireEvent.click(checkbox);

		expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).not.toHaveAttribute('disabled');

		balancesStore.reset(ETHEREUM_TOKEN_ID);
	});

	it('should disable the review button when agreement is checked but fee is not loaded', async () => {
		const { getByTestId, getByRole } = render(HarvestStakeForm, {
			props,
			context: buildContext({ feeLoaded: false })
		});

		const checkbox = getByRole('checkbox') as HTMLInputElement;
		await fireEvent.click(checkbox);

		expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).toHaveAttribute('disabled');
	});

	it('should disable the review button when amount is undefined', async () => {
		const { getByTestId, getByRole } = render(HarvestStakeForm, {
			props: { ...props, amount: undefined },
			context: buildContext()
		});

		const checkbox = getByRole('checkbox') as HTMLInputElement;
		await fireEvent.click(checkbox);

		expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).toHaveAttribute('disabled');
	});

	it('should render HarvestStakeFees', () => {
		const { getByText } = render(HarvestStakeForm, {
			props,
			context: buildContext()
		});

		expect(getByText(en.fee.text.network_fee)).toBeInTheDocument();
	});

	it('should render HarvestStakeAgreement', () => {
		const { getByRole } = render(HarvestStakeForm, {
			props,
			context: buildContext()
		});

		expect(getByRole('checkbox')).toBeInTheDocument();
	});

	it('should show insufficient funds for fee error when native balance is less than gas fee', () => {
		balancesStore.set({
			id: ETHEREUM_TOKEN_ID,
			data: { data: 100n, certified: false }
		});

		const { container } = render(HarvestStakeForm, {
			props,
			context: buildContext({ customSendBalance: 1000000000000000000n })
		});

		expect(container).toHaveTextContent(en.fee.assertion.insufficient_funds_for_fee);

		balancesStore.reset(ETHEREUM_TOKEN_ID);
	});

	it('should not show insufficient funds for fee error when native balance covers gas fee', () => {
		balancesStore.set({
			id: ETHEREUM_TOKEN_ID,
			data: { data: 1000000000000000000n, certified: false }
		});

		const { container } = render(HarvestStakeForm, {
			props,
			context: buildContext({ customSendBalance: 1000000000000000000n })
		});

		expect(container).not.toHaveTextContent(en.fee.assertion.insufficient_funds_for_fee);

		balancesStore.reset(ETHEREUM_TOKEN_ID);
	});

	it('should call onClose when cancel button is clicked', async () => {
		const onClose = vi.fn();

		const { getByText } = render(HarvestStakeForm, {
			props: { ...props, onClose },
			context: buildContext()
		});

		await fireEvent.click(getByText(en.core.text.cancel));

		expect(onClose).toHaveBeenCalledOnce();
	});
});
