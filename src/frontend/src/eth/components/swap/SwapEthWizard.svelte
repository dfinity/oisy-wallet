<script lang="ts">
	import { Html, type WizardStep } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import SwapEthForm from './SwapEthForm.svelte';
	import EthFeeContext from '$eth/components/fee/EthFeeContext.svelte';
	import EthFeeDisplay from '$eth/components/fee/EthFeeDisplay.svelte';
	import { ethereumToken } from '$eth/derived/token.derived';
	import {
		ETH_FEE_CONTEXT_KEY,
		initEthFeeContext,
		initEthFeeStore,
		type EthFeeContext as FeeContextType
	} from '$eth/stores/eth-fee.store';
	import type { Erc20Token } from '$eth/types/erc20';
	import type { EthereumNetwork } from '$eth/types/network';
	import type { ProgressStep } from '$eth/types/send';
	import { evmNativeToken } from '$evm/derived/token.derived';
	import { enabledEvmTokens } from '$evm/derived/tokens.derived';
	import SwapProgress from '$lib/components/swap/SwapProgress.svelte';
	import SwapReview from '$lib/components/swap/SwapReview.svelte';
	import {
		TRACK_COUNT_SWAP_ERROR,
		TRACK_COUNT_SWAP_SUCCESS
	} from '$lib/constants/analytics.contants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { ProgressStepsSwap } from '$lib/enums/progress-steps';
	import { WizardStepsSwap } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { fetchVeloraDeltaSwap, fetchVeloraMarketSwap } from '$lib/services/swap.services';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext as SwapAmountsContextType
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { OptionAmount } from '$lib/types/send';
	import { VeloraSwapTypes, type VeloraSwapDetails } from '$lib/types/swap';
	import type { TokenId } from '$lib/types/token';

	interface Props {
		swapAmount: OptionAmount;
		receiveAmount?: number;
		slippageValue: OptionAmount;
		swapProgressStep: ProgressStep;
		currentStep?: WizardStep;
		isSwapAmountsLoading: boolean;
		onShowTokensList: (tokenSource: 'source' | 'destination') => void;
		onClose: () => void;
		onNext: () => void;
		onBack: () => void;
	}

	let {
		swapAmount = $bindable(),
		receiveAmount = $bindable(),
		slippageValue = $bindable(),
		swapProgressStep = $bindable(),
		currentStep,
		isSwapAmountsLoading,
		onShowTokensList,
		onClose,
		onNext,
		onBack
	}: Props = $props();

	const { sourceToken, destinationToken, failedSwapError } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { store: swapAmountsStore } = getContext<SwapAmountsContextType>(SWAP_AMOUNTS_CONTEXT_KEY);

	/**
	 * Fee context store
	 */
	let fallbackEvmToken = $derived(
		nonNullish($sourceToken)
			? $enabledEvmTokens.find(
					({ network: { id: networkId } }) => $sourceToken.network.id === networkId
				)
			: undefined
	);

	let evmNativeEthereumToken = $derived($evmNativeToken ?? fallbackEvmToken);
	const feeStore = initEthFeeStore();

	let nativeEthereumToken = $derived(evmNativeEthereumToken ?? $ethereumToken);

	const feeSymbolStore = writable<string | undefined>(undefined);
	const feeTokenIdStore = writable<TokenId | undefined>(undefined);
	const feeDecimalsStore = writable<number | undefined>(undefined);
	const feeExchangeRateStore = writable<number | undefined>(undefined);

	$effect(() => {
		feeSymbolStore.set(nativeEthereumToken.symbol);
		feeTokenIdStore.set(nativeEthereumToken.id);
		feeDecimalsStore.set(nativeEthereumToken.decimals);
	});

	$effect(() => {
		feeExchangeRateStore.set($exchanges?.[nativeEthereumToken.id]?.usd);
	});

	const progress = (step: ProgressStepsSwap) => (swapProgressStep = step);
	let feeContext = $state<EthFeeContext | undefined>();
	const evaluateFee = () => feeContext?.triggerUpdateFee();

	setContext<FeeContextType>(
		ETH_FEE_CONTEXT_KEY,
		initEthFeeContext({
			feeStore,
			feeSymbolStore,
			feeTokenIdStore,
			feeDecimalsStore,
			feeExchangeRateStore,
			evaluateFee
		})
	);

	const swap = async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		if (isNullish($feeStore)) {
			toastsError({
				msg: { text: $i18n.send.assertion.gas_fees_not_defined }
			});
			return;
		}

		const { maxFeePerGas, maxPriorityFeePerGas, gas } = $feeStore;

		swapProgressStep = ProgressStepsSwap.INITIALIZATION;

		if (
			isNullish($sourceToken) ||
			isNullish($destinationToken) ||
			isNullish(slippageValue) ||
			isNullish(swapAmount) ||
			isNullish($swapAmountsStore?.selectedProvider?.receiveAmount) ||
			isNullish($swapAmountsStore?.selectedProvider?.provider) ||
			isNullish($ethAddress) ||
			isNullish(maxFeePerGas) ||
			isNullish(maxPriorityFeePerGas) ||
			isNullish(gas)
		) {
			toastsError({
				msg: { text: $i18n.swap.error.unexpected_missing_data }
			});
			return;
		}

		onNext();

		try {
			failedSwapError.set(undefined);

			const params = {
				identity: $authIdentity,
				progress: (step: ProgressStep) => (swapProgressStep = step),
				sourceToken: $sourceToken as Erc20Token,
				destinationToken: $destinationToken as Erc20Token,
				swapAmount,
				sourceNetwork: $sourceToken.network as EthereumNetwork,
				receiveAmount: $swapAmountsStore?.selectedProvider?.receiveAmount,
				slippageValue,
				destinationNetwork: $destinationToken.network as EthereumNetwork,
				userAddress: $ethAddress,
				gas,
				maxFeePerGas,
				maxPriorityFeePerGas,
				swapDetails: $swapAmountsStore.swaps[0].swapDetails as VeloraSwapDetails
			};

			if ($swapAmountsStore.swaps[0].type === VeloraSwapTypes.DELTA) {
				await fetchVeloraDeltaSwap(params);
			} else {
				await fetchVeloraMarketSwap(params);
			}

			progress(ProgressStepsSwap.DONE);

			trackEvent({
				name: TRACK_COUNT_SWAP_SUCCESS,
				metadata: {
					sourceToken: $sourceToken.symbol,
					destinationToken: $destinationToken.symbol,
					dApp: $swapAmountsStore.selectedProvider.provider
				}
			});

			setTimeout(() => onClose(), 750);
		} catch (err: unknown) {
			trackEvent({
				name: TRACK_COUNT_SWAP_ERROR,
				metadata: {
					sourceToken: $sourceToken.symbol,
					destinationToken: $destinationToken.symbol,
					dApp: $swapAmountsStore.selectedProvider.provider
				}
			});

			failedSwapError.set(undefined);

			toastsError({
				msg: { text: $i18n.swap.error.unexpected },
				err
			});

			onBack();
		}
	};
</script>

{#if nonNullish($sourceToken)}
	<EthFeeContext
		bind:this={feeContext}
		amount={swapAmount}
		{nativeEthereumToken}
		observe={currentStep?.name !== WizardStepsSwap.SWAPPING}
		sendToken={$sourceToken}
		sendTokenId={$sourceToken.id}
		sourceNetwork={$sourceToken.network as EthereumNetwork}
	>
		{#if currentStep?.name === WizardStepsSwap.SWAP}
			<SwapEthForm
				{isSwapAmountsLoading}
				{nativeEthereumToken}
				{onClose}
				{onNext}
				{onShowTokensList}
				bind:swapAmount
				bind:receiveAmount
				bind:slippageValue
			/>
		{:else if currentStep?.name === WizardStepsSwap.REVIEW}
			<SwapReview {onBack} onSwap={swap} {receiveAmount} {slippageValue} {swapAmount}>
				{#snippet swapFees()}
					<EthFeeDisplay>
						{#snippet label()}
							<Html text={$i18n.fee.text.total_fee} />
						{/snippet}
					</EthFeeDisplay>
				{/snippet}
			</SwapReview>
		{:else if currentStep?.name === WizardStepsSwap.SWAPPING}
			<SwapProgress sendWithApproval={true} bind:swapProgressStep />
		{/if}
	</EthFeeContext>
{/if}
