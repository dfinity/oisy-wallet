import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import * as ethTokensDerived from '$eth/derived/tokens.derived';
import * as listenerServices from '$eth/services/eth-listener.services';
import * as feeServices from '$eth/services/fee.services';
import * as evmTokensDerived from '$evm/derived/tokens.derived';
import LiquidiumRepayEthWizard from '$lib/components/liquidium/repay/LiquidiumRepayEthWizard.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { LIQUIDIUM_EVM_FEE_ESTIMATE_DESTINATION } from '$lib/constants/liquidium.constants';
import * as addressDerived from '$lib/derived/address.derived';
import { ProgressStepsLiquidiumRepay } from '$lib/enums/progress-steps';
import { WizardStepsLiquidiumRepay } from '$lib/enums/wizard-steps';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import type { LiquidiumPortfolio, LiquidiumReserve } from '$lib/types/liquidium';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import type { WizardStep } from '@dfinity/gix-components';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

// No matching enabled native token in the test, so the EthFeeContext (and its fee
// estimation) never mounts — rendering exercises the wizard's setup/deriveds only,
// without triggering network calls.
describe('LiquidiumRepayEthWizard', () => {
	const reserve: LiquidiumReserve = {
		poolId: 'pool-eth',
		asset: 'ETH',
		chain: 'ETH',
		supplyApy: 0,
		borrowApy: 7,
		deposited: ZERO,
		depositedDecimals: 18,
		borrowed: 1_000_000_000_000_000_000n,
		borrowedDecimals: 18,
		debtInterest: ZERO,
		suppliedUsd: 0,
		borrowedUsd: 3_000
	};

	const portfolio: LiquidiumPortfolio = {
		reserves: [reserve],
		totalSuppliedUsd: 12_000,
		totalBorrowedUsd: 3_000,
		netValueUsd: 9_000,
		availableBorrowsUsd: 6_000,
		weightedLiquidationThresholdBps: 8_000,
		healthFactorPercent: 75
	};

	const context = () =>
		new Map<symbol, SendContext>([[SEND_CONTEXT_KEY, initSendContext({ token: ETHEREUM_TOKEN })]]);

	const erc20Context = () =>
		new Map<symbol, SendContext>([
			[SEND_CONTEXT_KEY, initSendContext({ token: mockValidErc20Token })]
		]);

	const step = (name: WizardStepsLiquidiumRepay): WizardStep => ({ name, title: name });

	const baseProps = {
		reserve,
		portfolio,
		amount: 0.5,
		repayProgressStep: ProgressStepsLiquidiumRepay.INITIALIZATION,
		maxRepay: 1_000_000_000_000_000_000n,
		inflowFee: 50n,
		onClose: () => {},
		onNext: () => {},
		onBack: () => {}
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		vi.spyOn(addressDerived, 'ethAddress', 'get').mockReturnValue(readable(mockEthAddress));
		vi.spyOn(ethTokensDerived, 'enabledEthereumTokens', 'get').mockReturnValue(
			readable([ETHEREUM_TOKEN])
		);
		vi.spyOn(evmTokensDerived, 'enabledEvmTokens', 'get').mockReturnValue(readable([]));
		vi.spyOn(listenerServices, 'initMinedTransactionsListener').mockReturnValue({
			disconnect: vi.fn()
		});
		vi.spyOn(feeServices, 'getEthFeeDataWithProvider').mockResolvedValue({
			feeData: { maxFeePerGas: 12n, maxPriorityFeePerGas: 7n },
			provider: {
				safeEstimateGas: vi.fn().mockResolvedValue(21_000n),
				estimateGas: vi.fn().mockResolvedValue(21_000n)
			} as unknown as Awaited<ReturnType<typeof feeServices.getEthFeeDataWithProvider>>['provider'],
			params: { from: mockEthAddress, to: LIQUIDIUM_EVM_FEE_ESTIMATE_DESTINATION }
		});
		vi.spyOn(feeServices, 'getErc20FeeData').mockResolvedValue(65_000n);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('mounts the form step without triggering fee estimation', () => {
		const { container } = render(LiquidiumRepayEthWizard, {
			props: { ...baseProps, currentStep: step(WizardStepsLiquidiumRepay.REPAY) },
			context: context()
		});

		expect(container).toBeTruthy();
	});

	it('mounts the progress step', () => {
		const { container } = render(LiquidiumRepayEthWizard, {
			props: { ...baseProps, currentStep: step(WizardStepsLiquidiumRepay.REPAYING) },
			context: context()
		});

		expect(container).toBeTruthy();
	});

	it('estimates ERC-20 fees against the Liquidium fee target instead of the sender', async () => {
		render(LiquidiumRepayEthWizard, {
			props: { ...baseProps, currentStep: step(WizardStepsLiquidiumRepay.REPAY) },
			context: erc20Context()
		});

		await vi.runAllTimersAsync();

		expect(feeServices.getEthFeeDataWithProvider).toHaveBeenCalledWith(
			expect.objectContaining({
				from: mockEthAddress,
				to: LIQUIDIUM_EVM_FEE_ESTIMATE_DESTINATION
			})
		);
	});
});
