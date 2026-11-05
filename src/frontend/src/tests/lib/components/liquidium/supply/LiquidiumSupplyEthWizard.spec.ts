import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import * as tokensDerived from '$eth/derived/tokens.derived';
import type { EthFeeStore, FeeStoreData } from '$eth/stores/eth-fee.store';
import * as feeStoreMod from '$eth/stores/eth-fee.store';
import { EthSubmissionUnconfirmedError } from '$eth/types/send';
import LiquidiumSupplyEthWizard from '$lib/components/liquidium/supply/LiquidiumSupplyEthWizard.svelte';
import { STAKE_REVIEW_FORM_BUTTON } from '$lib/constants/test-ids.constants';
import * as addrDerived from '$lib/derived/address.derived';
import * as idDerived from '$lib/derived/auth.derived';
import { ProgressStepsLiquidiumSupply } from '$lib/enums/progress-steps';
import { WizardStepsLiquidiumSupply } from '$lib/enums/wizard-steps';
import * as liquidiumSupplyServices from '$lib/services/liquidium-supply.services';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import * as toasts from '$lib/stores/toasts.store';
import type { LiquidiumMarket } from '$lib/types/liquidium';
import type { WizardStep } from '$lib/types/wizard';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { readable, writable } from 'svelte/store';

// No matching enabled native token in the mount tests, so the EthFeeContext (and its fee
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

	describe('when the supply fails', () => {
		beforeEach(() => {
			vi.clearAllMocks();
			vi.useFakeTimers();

			// The review needs the native token to mount, and a fee to supply with.
			vi.spyOn(tokensDerived, 'enabledEthereumTokens', 'get').mockReturnValue(
				readable([ETHEREUM_TOKEN])
			);
			vi.spyOn(addrDerived, 'ethAddress', 'get').mockReturnValue(readable(mockEthAddress));
			vi.spyOn(idDerived, 'authIdentity', 'get').mockImplementation(() => readable(mockIdentity));
			vi.spyOn(toasts, 'toastsError').mockImplementation(() => Symbol('toast'));
			vi.spyOn(toasts, 'toastsErrorNoTrace').mockImplementation(() => Symbol('toast'));

			const feeState = writable<FeeStoreData>({
				gas: 21_000n,
				maxFeePerGas: 2_000_000n,
				maxPriorityFeePerGas: 1_000_000n
			});
			const feeStore: EthFeeStore = {
				subscribe: feeState.subscribe,
				setFee: vi.fn((partial) => feeState.update((cur) => ({ ...cur, ...partial })))
			};
			vi.spyOn(feeStoreMod, 'initEthFeeStore').mockReturnValue(feeStore);
			vi.spyOn(feeStoreMod, 'initEthFeeContext').mockImplementation((ctx) => ({
				...ctx,
				maxGasFee: readable(42_000_000_000n),
				minGasFee: readable(undefined),
				estimatedGasFee: readable(undefined),
				feePrioritiesStore: writable(undefined)
			}));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		const supply = async ({ err }: { err: unknown }) => {
			vi.spyOn(liquidiumSupplyServices, 'executeLiquidiumSupply').mockRejectedValue(err);

			const onBack = vi.fn();
			const onClose = vi.fn();

			const { getByTestId } = render(LiquidiumSupplyEthWizard, {
				props: {
					...baseProps,
					onBack,
					onClose,
					currentStep: step(WizardStepsLiquidiumSupply.REVIEW)
				},
				context: context()
			});

			await fireEvent.click(getByTestId(STAKE_REVIEW_FORM_BUTTON));
			await vi.runOnlyPendingTimersAsync();

			expect(liquidiumSupplyServices.executeLiquidiumSupply).toHaveBeenCalledOnce();

			return { onBack, onClose };
		};

		// The supply may have reached the network: supplied again from the review, it would be
		// signed with the next nonce, and both could execute.
		it('closes with the could-not-confirm toast when the outcome of the supply is unknown', async () => {
			const err = new EthSubmissionUnconfirmedError(new Error('Internal error'));

			const { onBack, onClose } = await supply({ err });

			expect(onClose).toHaveBeenCalledOnce();
			expect(onBack).not.toHaveBeenCalled();
			expect(toasts.toastsErrorNoTrace).toHaveBeenCalledExactlyOnceWith({
				msg: { text: en.send.error.ethereum_transaction_unconfirmed },
				err
			});
			expect(toasts.toastsError).not.toHaveBeenCalledWith(
				expect.objectContaining({ msg: { text: en.liquidium.text.transaction_failed } })
			);
		});

		it('goes back to the review with its own toast after any other failure', async () => {
			const err = Object.assign(new Error('insufficient funds'), { code: 'INSUFFICIENT_FUNDS' });

			const { onBack, onClose } = await supply({ err });

			expect(onBack).toHaveBeenCalledOnce();
			expect(onClose).not.toHaveBeenCalled();
			expect(toasts.toastsError).toHaveBeenCalledWith({
				msg: { text: en.liquidium.text.transaction_failed },
				err
			});
		});
	});
});
