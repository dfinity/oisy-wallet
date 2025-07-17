<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext, setContext } from 'svelte';
	import { WizardStepsSwap } from '$lib/enums/wizard-steps';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext as SwapAmountsContextType
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';
	import {
		ETH_FEE_CONTEXT_KEY,
		initEthFeeContext,
		initEthFeeStore,
		type EthFeeContext as FeeContextType
	} from '$eth/stores/eth-fee.store';
	import { writable } from 'svelte/store';
	import { enabledEvmTokens } from '$evm/derived/tokens.derived';
	import { evmNativeToken } from '$evm/derived/token.derived';
	import { ethereumToken } from '$eth/derived/token.derived';
	import { type TokenId } from '$lib/types/token';
	import { exchanges } from '$lib/derived/exchange.derived';
	import type { Token } from '$lib/types/token';
	import EthFeeContext from '$eth/components/fee/EthFeeContext.svelte';
	import type { EthereumNetwork } from '$eth/types/network';
	import EvmSwapForm from './EvmSwapForm.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import SwapReview from './SwapReview.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { toastsError } from '$lib/stores/toasts.store';
	import { fetchVeloraDeltaSwap, fetchVeloraMarketSwap } from '$lib/services/swap.services';
	import { trackEvent } from '$lib/services/analytics.services';
	import {
		TRACK_COUNT_SWAP_ERROR,
		TRACK_COUNT_SWAP_SUCCESS
	} from '$lib/constants/analytics.contants';
	import { ProgressStepsSwap } from '$lib/enums/progress-steps';
	import { ethAddress } from '$lib/derived/address.derived';
	import { SwapProvider, VeloraSwapTypes, type VeloraSwapDetails } from '$lib/types/swap';
	import SwapProgress from './SwapProgress.svelte';
	import type { ProgressStep } from '$eth/types/send';
	import type { Erc20Token } from '$eth/types/erc20';

	interface Props {
		swapAmount: OptionAmount;
		receiveAmount: number | undefined;
		slippageValue: OptionAmount;
		swapProgressStep: string;
		currentStep: WizardStep | undefined;
	}
	let {
		swapAmount = $bindable<OptionAmount>(),
		receiveAmount = $bindable<number | undefined>(),
		slippageValue = $bindable<OptionAmount>(),
		swapProgressStep = $bindable<string>(),
		currentStep
	}: Props = $props();

	const {
		sourceToken,
		destinationToken,
		failedSwapError,
		sourceTokenNetwork,
		destinationTokenNetwork
	} = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { store: swapAmountsStore } = getContext<SwapAmountsContextType>(SWAP_AMOUNTS_CONTEXT_KEY);

	const dispatch = createEventDispatcher();

	/**
	 * Fee context store
	 */

	let fallbackEvmToken: Token | undefined = $derived(
		nonNullish($sourceToken)
			? $enabledEvmTokens.find(
					({ network: { id: networkId } }) => $sourceToken.network.id === networkId
				)
			: undefined
	);

	let evmNativeEthereumToken: Token | undefined = $derived($evmNativeToken ?? fallbackEvmToken);

	const feeStore = initEthFeeStore();

	let nativeEthereumToken: Token | undefined = $derived(
		nonNullish(evmNativeEthereumToken) ? evmNativeEthereumToken : $ethereumToken
	);

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

	let feeContext: EthFeeContext | undefined;
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
			isNullish($sourceTokenNetwork) ||
			isNullish($destinationTokenNetwork) ||
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

		dispatch('icNext');

		try {
			failedSwapError.set(undefined);

			const params = {
				identity: $authIdentity,
				progress: (step: ProgressStep) => (swapProgressStep = step),
				sourceToken: $sourceToken as Erc20Token,
				destinationToken: $destinationToken as Erc20Token,
				swapAmount,
				sourceNetwork: $sourceTokenNetwork as EthereumNetwork,
				receiveAmount: $swapAmountsStore?.selectedProvider?.receiveAmount,
				slippageValue,
				destinationNetwork: $destinationTokenNetwork as EthereumNetwork,
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

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			trackEvent({
				name: TRACK_COUNT_SWAP_ERROR,
				metadata: {
					sourceToken: $sourceToken.symbol,
					destinationToken: $destinationToken.symbol,
					dApp: $swapAmountsStore.selectedProvider.provider
				}
			});

			dispatch('icStartTrigger');
			back();
		}
	};

	const close = () => dispatch('icClose');
	const back = () => dispatch('icBack');
</script>

<EthFeeContext
	bind:this={feeContext}
	sendToken={$sourceToken as Token}
	sendTokenId={($sourceToken as Token).id}
	amount={swapAmount}
	observe={currentStep?.name !== WizardStepsSwap.SWAPPING}
	sourceNetwork={$sourceToken?.network as EthereumNetwork}
	{nativeEthereumToken}
>
	{#if currentStep?.name === WizardStepsSwap.SWAP}
		<EvmSwapForm
			on:icClose
			on:icNext
			on:icShowTokensList
			on:icShowProviderList
			bind:swapAmount
			bind:receiveAmount
			bind:slippageValue
			{nativeEthereumToken}
		/>
	{:else if currentStep?.name === WizardStepsSwap.REVIEW}
		<SwapReview
			on:icSwap={swap}
			on:icBack
			on:icStopTrigger
			{slippageValue}
			{swapAmount}
			{receiveAmount}
		/>
	{:else if currentStep?.name === WizardStepsSwap.SWAPPING}
		<SwapProgress bind:swapProgressStep sendWithApproval={true} />
	{/if}
</EthFeeContext>
