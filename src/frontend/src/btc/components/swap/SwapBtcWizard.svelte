<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import SwapBtcFees from '$btc/components/swap/SwapBtcFees.svelte';
	import SwapBtcForm from '$btc/components/swap/SwapBtcForm.svelte';
	import { handleBtcValidationError, validateBtcSend } from '$btc/services/btc-send.services';
	import {
		UTXOS_FEE_CONTEXT_KEY,
		type UtxosFeeContext as UtxosFeeContextType
	} from '$btc/stores/utxos-fee.store';
	import { BtcValidationError } from '$btc/types/btc-send';
	import { BTC_EXTENSION_FEATURE_FLAG_ENABLED } from '$env/btc.env';
	import { btcAddressStore } from '$icp/stores/btc.store';
	import SwapProgress from '$lib/components/swap/SwapProgress.svelte';
	import SwapReview from '$lib/components/swap/SwapReview.svelte';
	import {
		TRACK_COUNT_SWAP_ERROR,
		TRACK_COUNT_SWAP_SUCCESS
	} from '$lib/constants/analytics.constants';
	import { btcAddressMainnet } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsSwap } from '$lib/enums/progress-steps';
	import { WizardStepsSwap } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { fetchChainFusionBtcSwap } from '$lib/services/chain-fusion-swap.services';
	import { enableSwapDestinationToken } from '$lib/services/swap.services';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext as SwapAmountsContextType
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { WizardStep } from '$lib/types/wizard';
	import { errorDetailToString } from '$lib/utils/error.utils';
	import { formatTokenBigintToNumber } from '$lib/utils/format.utils';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { mapNetworkIdToBitcoinNetwork } from '$lib/utils/network.utils';

	interface Props {
		swapAmount: OptionAmount;
		receiveAmount?: number;
		slippageValue: OptionAmount;
		swapProgressStep: ProgressStepsSwap;
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

	const { sourceToken, destinationToken, sourceTokenExchangeRate } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { store: swapAmountsStore } = getContext<SwapAmountsContextType>(SWAP_AMOUNTS_CONTEXT_KEY);

	const { store: utxosFeeStore } = getContext<UtxosFeeContextType>(UTXOS_FEE_CONTEXT_KEY);

	const progress = (step: ProgressStepsSwap) => (swapProgressStep = step);

	$effect(() => {
		receiveAmount =
			nonNullish($destinationToken) &&
			nonNullish($swapAmountsStore?.selectedProvider?.receiveAmount)
				? formatTokenBigintToNumber({
						value: $swapAmountsStore.selectedProvider.receiveAmount,
						unitName: $destinationToken.decimals,
						displayDecimals: $destinationToken.decimals
					})
				: undefined;
	});

	let networkId = $derived($sourceToken?.network.id);

	// Swap is mainnet-only, so the source is always the mainnet address — no testnet /
	// regtest branch, unlike the Convert wizard which is reachable from any BTC page.
	let sourceAddress = $derived($btcAddressMainnet ?? '');

	// The per-user deposit address the ckBTC minter watches — different from the user's own
	// address. Filled app-wide by the update-balance worker whenever the ckBTC twin is
	// enabled, which is also what the quote requires before it offers this direction.
	// Docs: https://github.com/dfinity/ic/blob/master/rs/bitcoin/ckbtc/minter/README.adoc#bitcoin-to-ckbtc
	let depositAddress = $derived(
		nonNullish($destinationToken) ? $btcAddressStore?.[$destinationToken.id]?.data : undefined
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

		swapProgressStep = ProgressStepsSwap.INITIALIZATION;

		const network = nonNullish(networkId) ? mapNetworkIdToBitcoinNetwork(networkId) : undefined;
		const utxosFee = $utxosFeeStore?.utxosFee;

		if (
			isNullish($sourceToken) ||
			isNullish($destinationToken) ||
			isNullish(swapAmount) ||
			isNullish(network) ||
			isNullish(utxosFee) ||
			isNullishOrEmpty(sourceAddress) ||
			isNullishOrEmpty(depositAddress) ||
			isNullish($swapAmountsStore?.selectedProvider?.provider)
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

		if (BTC_EXTENSION_FEATURE_FLAG_ENABLED) {
			// Last-line guard against a race: between the quote and the broadcast another tab
			// may have reserved one of the UTXOs this selection covers. Going back lets the
			// user refresh the fee preview and retry, exactly as the Convert wizard does.
			try {
				await validateBtcSend({
					utxosFee,
					source: sourceAddress,
					amount: swapAmount,
					network,
					identity: $authIdentity
				});
			} catch (err: unknown) {
				// Named, not swallowed. The Send and Convert wizards bounce back silently here,
				// which works for them because the fee preview they return to is unchanged. This
				// flow's quote refetches every 5 seconds, so a locked UTXO makes the offer vanish
				// moments later and Review goes dead — without a message the user is left with a
				// disabled button and no reason for it.
				if (err instanceof BtcValidationError) {
					handleBtcValidationError({ err });
				} else {
					toastsError({ msg: { text: $i18n.swap.error.unexpected }, err });
				}

				onBack();
				onStartTriggerAmount();
				return;
			}
		}

		try {
			await fetchChainFusionBtcSwap({
				identity: $authIdentity,
				progress,
				amount: swapAmount,
				source: sourceAddress,
				depositAddress,
				network,
				utxosFee,
				enableDestinationToken: () =>
					enableSwapDestinationToken({
						destinationToken: $destinationToken,
						identity: $authIdentity
					})
			});

			progress(ProgressStepsSwap.DONE);

			// A ckBTC mint has no active-user-transaction row yet, so the foreground *is* the
			// whole tracked flow: the deposit is broadcast and the minter credits it out of
			// band, exactly as in the Convert flow. Hence `success`, not `submitted`.
			trackEvent({
				name: TRACK_COUNT_SWAP_SUCCESS,
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
			trackEvent({
				name: TRACK_COUNT_SWAP_ERROR,
				metadata: {
					...swapTrackingMetadata,
					error: errorDetailToString(err) ?? ''
				}
			});

			toastsError({
				msg: { text: $i18n.swap.error.unexpected },
				err
			});

			onBack();
			onStartTriggerAmount();
		}
	};
</script>

{#key currentStep?.name}
	{#if currentStep?.name === WizardStepsSwap.SWAP}
		<SwapBtcForm
			{isSwapAmountsLoading}
			{onClose}
			{onNext}
			{onShowProviderList}
			{onShowTokensList}
			source={sourceAddress}
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
				<SwapBtcFees />
			{/snippet}
		</SwapReview>
	{:else if currentStep?.name === WizardStepsSwap.SWAPPING}
		<SwapProgress {swapProgressStep} />
	{/if}
{/key}
