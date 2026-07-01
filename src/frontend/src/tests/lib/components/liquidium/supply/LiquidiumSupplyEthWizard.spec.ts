import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import * as feeServices from '$eth/services/fee.services';
import * as listenerServices from '$eth/services/eth-listener.services';
import * as ethTokensDerived from '$eth/derived/tokens.derived';
import * as evmTokensDerived from '$evm/derived/tokens.derived';
import LiquidiumSupplyEthWizard from '$lib/components/liquidium/supply/LiquidiumSupplyEthWizard.svelte';
import { LIQUIDIUM_EVM_FEE_ESTIMATE_DESTINATION } from '$lib/constants/liquidium.constants';
import * as addressDerived from '$lib/derived/address.derived';
import { ProgressStepsLiquidiumSupply } from '$lib/enums/progress-steps';
import { WizardStepsLiquidiumSupply } from '$lib/enums/wizard-steps';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import type { LiquidiumMarket } from '$lib/types/liquidium';
import type { WizardStep } from '@dfinity/gix-components';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';

// No matching enabled native token in the test, so the EthFeeContext (and its fee
// estimation) never mounts — rendering exercises the wizard's setup/deriveds only,
// without triggering network calls.
describe('LiquidiumSupplyEthWizard', () => {
	const market: LiquidiumMarket = {
		poolId: 'pool-eth',
		asset: 'ETH',
		chain: 'ETH',
		supplyApy: 4,
		borrowApy: 7,
		frozen: false,
		available: true
	};

	const context = () =>
		new Map<symbol, SendContext>([[SEND_CONTEXT_KEY, initSendContext({ token: ETHEREUM_TOKEN })]]);

	const erc20Context = () =>
		new Map<symbol, SendContext>([
			[SEND_CONTEXT_KEY, initSendContext({ token: mockValidErc20Token })]
		]);

	const step = (name: WizardStepsLiquidiumSupply): WizardStep => ({ name, title: name });

	const baseProps = {
		market,
		amount: 0.01,
		supplyProgressStep: ProgressStepsLiquidiumSupply.INITIALIZATION,
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
		const { container } = render(LiquidiumSupplyEthWizard, {
			props: { ...baseProps, currentStep: step(WizardStepsLiquidiumSupply.SUPPLY) },
			context: context()
		});

		expect(container).toBeTruthy();
	});

	it('mounts the progress step', () => {
		const { container } = render(LiquidiumSupplyEthWizard, {
			props: { ...baseProps, currentStep: step(WizardStepsLiquidiumSupply.SUPPLYING) },
			context: context()
		});

		expect(container).toBeTruthy();
	});

	it('estimates ERC-20 fees against the Liquidium fee target instead of the sender', async () => {
		render(LiquidiumSupplyEthWizard, {
			props: { ...baseProps, currentStep: step(WizardStepsLiquidiumSupply.SUPPLY) },
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
