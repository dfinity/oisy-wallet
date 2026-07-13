<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import { NEAR_INTENTS_SWAP_ENABLED } from '$env/rest/near-intents.env';
	import EthFeeContext from '$eth/components/fee/EthFeeContext.svelte';
	import EthFeeDisplay from '$eth/components/fee/EthFeeDisplay.svelte';
	import SwapEthForm from '$eth/components/swap/SwapEthForm.svelte';
	import { enabledEthEvmNativeTokens } from '$eth/derived/native-tokens.derived';
	import { infuraErc20Providers } from '$eth/providers/infura-erc20.providers';
	import {
		ETH_FEE_CONTEXT_KEY,
		type EthFeeContext as FeeContextType,
		initEthFeeContext,
		initEthFeeStore
	} from '$eth/stores/eth-fee.store';
	import type { Erc20Token } from '$eth/types/erc20';
	import type { ProgressStep } from '$eth/types/send';
	import { isTokenErc20 } from '$eth/utils/erc20.utils';
	import { isNotDefaultEthereumToken } from '$eth/utils/eth.utils';
	import { isIcToken } from '$icp/validation/ic-token.validation';
	import SwapGaslessFee from '$lib/components/swap/SwapGaslessFee.svelte';
	import SwapProgress from '$lib/components/swap/SwapProgress.svelte';
	import SwapReview from '$lib/components/swap/SwapReview.svelte';
	import Html from '$lib/components/ui/Html.svelte';
	import {
		TRACK_COUNT_SWAP_ERROR,
		TRACK_COUNT_SWAP_SUBMITTED,
		TRACK_COUNT_SWAP_SUCCESS
	} from '$lib/constants/analytics.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { userProfileVersion } from '$lib/derived/user-profile.derived';
	import { hasAcknowledgedNearIntentsSwap } from '$lib/derived/user-provider-agreements.derived';
	import { ProgressStepsSwap } from '$lib/enums/progress-steps';
	import { WizardStepsSwap } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { acceptProviderAgreement } from '$lib/services/provider-agreements.services';
	import {
		fetchNearIntentsEvmSwap,
		fetchOneSecEvmToIcpSwap,
		fetchVeloraDeltaSwap,
		fetchVeloraMarketSwap
	} from '$lib/services/swap.services';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext as SwapAmountsContextType
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { OptionAmount } from '$lib/types/send';
	import { SwapProvider, VeloraSwapTypes } from '$lib/types/swap';
	import type { TokenId } from '$lib/types/token';
	import type { WizardStep } from '$lib/types/wizard';
	import { errorDetailToString } from '$lib/utils/error.utils';
	import { formatTokenBigintToNumber } from '$lib/utils/format.utils';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isNetworkEthereum } from '$lib/utils/network.utils';

	interface Props {
		swapAmount: OptionAmount;
		receiveAmount?: number;
		slippageValue: OptionAmount;
		swapProgressStep: ProgressStep;
		currentStep?: WizardStep;
		isSwapAmountsLoading: boolean;
		onShowTokensList: (tokenSource: 'source' | 'destination') => void;
		onShowProviderList: () => void;
		onClose: () => void;
		onNext: () => void;
		onBack: () => void;
		onStopTriggerAmount: () => void;
		onStartTriggerAmount: () => void;
	}

	let {
		swapAmount = $bindable(),
		receiveAmount = $bindable(),
		slippageValue = $bindable(),
		swapProgressStep = $bindable(),
		currentStep,
		isSwapAmountsLoading,
		onStopTriggerAmount,
		onStartTriggerAmount,
		onShowTokensList,
		onShowProviderList,
		onClose,
		onNext,
		onBack
	}: Props = $props();

	const {
		sourceToken,
		destinationToken,
		failedSwapError,
		sourceTokenExchangeRate,
		setIsTokenPermitSupported,
		isSourceTokenPermitSupported
	} = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { store: swapAmountsStore } = getContext<SwapAmountsContextType>(SWAP_AMOUNTS_CONTEXT_KEY);

	/**
	 * Fee context store
	 */
	const feeStore = initEthFeeStore();

	let nativeEthereumToken = $derived(
		$enabledEthEvmNativeTokens.find(
			({ network: { id: networkId } }) => $sourceToken?.network.id === networkId
		)
	);

	const feeSymbolStore = writable<string | undefined>(undefined);
	const feeTokenIdStore = writable<TokenId | undefined>(undefined);
	const feeDecimalsStore = writable<number | undefined>(undefined);
	const feeExchangeRateStore = writable<number | undefined>(undefined);

	$effect(() => {
		if (nonNullish(nativeEthereumToken)) {
			feeSymbolStore.set(nativeEthereumToken.symbol);
			feeTokenIdStore.set(nativeEthereumToken.id);
			feeDecimalsStore.set(nativeEthereumToken.decimals);
		}
	});

	$effect(() => {
		if (nonNullish(nativeEthereumToken)) {
			feeExchangeRateStore.set($exchanges?.[nativeEthereumToken.id]?.usd);
		}
	});

	// Automatically update receiveAmount when store changes (for price updates every 5 seconds)
	$effect(() => {
		receiveAmount =
			nonNullish($destinationToken) &&
			nonNullish($swapAmountsStore?.selectedProvider?.receiveAmount)
				? formatTokenBigintToNumber({
						value: $swapAmountsStore?.selectedProvider?.receiveAmount,
						unitName: $destinationToken.decimals,
						displayDecimals: $destinationToken.decimals
					})
				: undefined;
	});

	$effect(() => {
		if (
			isNullish($sourceToken) ||
			!isTokenErc20($sourceToken) ||
			isNullish($ethAddress) ||
			nonNullish($isSourceTokenPermitSupported)
		) {
			return;
		}
		(async () => {
			const { isErc20SupportsPermit } = infuraErc20Providers($sourceToken.network.id);
			const isPermitSupported = await isErc20SupportsPermit({
				contractAddress: $sourceToken.address,
				userAddress: $ethAddress
			});
			setIsTokenPermitSupported({
				address: $sourceToken.address,
				isPermitSupported
			});
		})();
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

	const isNearIntentsProvider = $derived(
		$swapAmountsStore?.selectedProvider?.provider === SwapProvider.NEAR_INTENTS
	);

	const isApproveNeeded = $derived(
		!isNearIntentsProvider &&
			$swapAmountsStore?.selectedProvider?.type === VeloraSwapTypes.MARKET &&
			isNotDefaultEthereumToken($sourceToken)
	);

	const swapEmitsApprovalSteps = $derived(
		!isNearIntentsProvider &&
			$swapAmountsStore?.selectedProvider?.provider === SwapProvider.VELORA &&
			isNotDefaultEthereumToken($sourceToken)
	);

	const isTransferNeeded = $derived(isNearIntentsProvider);

	const isGasless = $derived(
		$swapAmountsStore?.selectedProvider?.provider === SwapProvider.VELORA &&
			$swapAmountsStore?.selectedProvider?.type === VeloraSwapTypes.DELTA &&
			nonNullish($isSourceTokenPermitSupported) &&
			$isSourceTokenPermitSupported
	);

	let sourceTokenUsdValue = $derived(
		nonNullish($sourceTokenExchangeRate) && nonNullish($sourceToken) && nonNullish(swapAmount)
			? `${Number(swapAmount) * $sourceTokenExchangeRate}`
			: undefined
	);

	const swap = async () => {
		if (isNullish($authIdentity)) {
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
			isNullish(gas) ||
			!isNetworkEthereum($sourceToken.network)
		) {
			toastsError({
				msg: { text: $i18n.swap.error.unexpected_missing_data }
			});
			return;
		}

		const swapTrackingMetadata = {
			sourceToken: $sourceToken.symbol,
			destinationToken: $destinationToken.symbol,
			dApp: $swapAmountsStore.selectedProvider.provider,
			usdSourceValue: sourceTokenUsdValue ?? '',
			swapType: $swapAmountsStore.selectedProvider.type ?? '',
			sourceNetwork: $sourceToken.network.name,
			destinationNetwork: $destinationToken.network.name
		};

		onNext();
		onStopTriggerAmount();

		const { selectedProvider } = $swapAmountsStore;

		try {
			failedSwapError.set(undefined);

			const baseParams = {
				identity: $authIdentity,
				progress: (step: ProgressStep) => (swapProgressStep = step),
				sourceToken: $sourceToken as Erc20Token,
				swapAmount,
				sourceNetwork: $sourceToken.network,
				slippageValue,
				userAddress: $ethAddress,
				gas,
				maxFeePerGas,
				maxPriorityFeePerGas
			};

			if (selectedProvider?.provider === SwapProvider.NEAR_INTENTS && NEAR_INTENTS_SWAP_ENABLED) {
				if (!$hasAcknowledgedNearIntentsSwap) {
					// To be conservative on the legal side, we only allow the swap if persisting
					// the provider agreement succeeds. If it fails we abort, since the user must
					// explicitly accept the ToS before funds move through a third-party provider.
					try {
						await acceptProviderAgreement({
							identity: $authIdentity,
							currentUserVersion: $userProfileVersion
						});
					} catch (err) {
						toastsError({
							msg: { text: $i18n.swap.error.cannot_save_provider_agreement },
							err
						});

						onBack();

						onStartTriggerAmount();

						return;
					}
				}

				const params = {
					...baseParams,
					destinationToken: $destinationToken as Erc20Token,
					receiveAmount: selectedProvider.receiveAmount,
					swapDetails: selectedProvider.swapDetails
				};

				await fetchNearIntentsEvmSwap(params);
			} else if (selectedProvider?.provider === SwapProvider.VELORA) {
				// Velora requires EVM destination chain params, but Near Intents can bridge to/from non-EVM networks.
				if (!isNetworkEthereum($destinationToken.network)) {
					toastsError({
						msg: { text: $i18n.swap.error.unexpected_missing_data }
					});

					onBack();
					onStartTriggerAmount();

					return;
				}

				const params = {
					...baseParams,
					destinationToken: $destinationToken as Erc20Token,
					receiveAmount: selectedProvider.receiveAmount,
					isGasless: $isSourceTokenPermitSupported ?? false,
					destinationNetwork: $destinationToken.network,
					swapDetails: selectedProvider.swapDetails
				};

				if (selectedProvider.type === VeloraSwapTypes.DELTA) {
					await fetchVeloraDeltaSwap(params);
				} else {
					await fetchVeloraMarketSwap(params);
				}
			} else if (selectedProvider?.provider === SwapProvider.ONE_SEC) {
				if (!isIcToken($destinationToken) || isNullish($ethAddress)) {
					toastsError({
						msg: { text: $i18n.swap.error.unexpected_missing_data }
					});

					onBack();
					onStartTriggerAmount();

					return;
				}

				await fetchOneSecEvmToIcpSwap({
					identity: $authIdentity,
					progress,
					sourceToken: $sourceToken as Erc20Token,
					destinationToken: $destinationToken,
					swapAmount,
					userEthAddress: $ethAddress,
					gas,
					maxFeePerGas,
					maxPriorityFeePerGas,
					swapId: crypto.randomUUID()
				});
			} else {
				toastsError({
					msg: { text: $i18n.swap.error.unexpected }
				});

				onBack();
				onStartTriggerAmount();

				return;
			}

			progress(ProgressStepsSwap.DONE);

			// For OneSec swaps, the foreground completes once the user's funds have
			// left their wallet; success/failure of the background phase is tracked
			// separately via the AUT store. Other providers (Velora, Near) still
			// complete fully inside `await` and reach this point only on success.
			trackEvent({
				name:
					$swapAmountsStore?.selectedProvider?.provider === SwapProvider.ONE_SEC
						? TRACK_COUNT_SWAP_SUBMITTED
						: TRACK_COUNT_SWAP_SUCCESS,
				metadata: swapTrackingMetadata
			});

			setTimeout(() => {
				try {
					onClose();
				} catch (_: unknown) {
					toastsError({
						msg: { text: $i18n.swap.error.swap_completed_close_failed }
					});
				}
			}, 750);
		} catch (err: unknown) {
			const errorDetail = errorDetailToString(err);

			trackEvent({
				name: TRACK_COUNT_SWAP_ERROR,
				metadata: {
					...swapTrackingMetadata,
					error: errorDetail ?? ''
				}
			});

			if (nonNullish(errorDetail) && errorDetail.startsWith('Slippage exceeded.')) {
				failedSwapError.set({
					message: replacePlaceholders(
						replaceOisyPlaceholders($i18n.swap.error.slippage_exceeded),
						{
							$maxSlippage: slippageValue.toString()
						}
					),
					variant: 'info'
				});
			} else {
				failedSwapError.set({
					message: $i18n.swap.error.failed_unexpectedly,
					variant: 'error'
				});
			}

			onBack();
			onStartTriggerAmount();
		}
	};
</script>

{#if nonNullish($sourceToken) && nonNullish(nativeEthereumToken) && isNetworkEthereum($sourceToken.network)}
	<EthFeeContext
		bind:this={feeContext}
		amount={swapAmount}
		{nativeEthereumToken}
		observe={currentStep?.name !== WizardStepsSwap.SWAPPING}
		sendToken={$sourceToken}
		sendTokenId={$sourceToken.id}
		sourceNetwork={$sourceToken.network}
	>
		{#key currentStep?.name}
			{#if currentStep?.name === WizardStepsSwap.SWAP}
				<SwapEthForm
					{isApproveNeeded}
					{isGasless}
					{isSwapAmountsLoading}
					{nativeEthereumToken}
					{onClose}
					{onNext}
					{onShowProviderList}
					{onShowTokensList}
					bind:swapAmount
					bind:receiveAmount
					bind:slippageValue
				/>
			{:else if currentStep?.name === WizardStepsSwap.REVIEW}
				<SwapReview
					isSwapAmountsLoading={isSwapAmountsLoading &&
						receiveAmount !== $swapAmountsStore?.selectedProvider?.receiveAmount}
					{onBack}
					onSwap={swap}
					{receiveAmount}
					{slippageValue}
					{swapAmount}
				>
					{#snippet swapFees()}
						{#if isGasless}
							<SwapGaslessFee />
						{:else}
							<EthFeeDisplay>
								{#snippet label()}
									<Html text={$i18n.fee.text.total_fee} />
								{/snippet}
							</EthFeeDisplay>
						{/if}
					{/snippet}
				</SwapReview>
			{:else if currentStep?.name === WizardStepsSwap.SWAPPING}
				<SwapProgress
					sendWithApproval={swapEmitsApprovalSteps}
					sendWithTransfer={isTransferNeeded}
					{swapProgressStep}
					swapWithActiveTransaction={$swapAmountsStore?.selectedProvider?.provider ===
						SwapProvider.ONE_SEC}
				/>
			{/if}
		{/key}
	</EthFeeContext>
{/if}
