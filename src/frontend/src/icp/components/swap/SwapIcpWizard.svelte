<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { isTokenErc20 } from '$eth/utils/erc20.utils';
	import IcTokenFeeContext from '$icp/components/fee/IcTokenFeeContext.svelte';
	import SwapIcpForm from '$icp/components/swap/SwapIcpForm.svelte';
	import { isIcrcTokenSupportIcrc2 } from '$icp/services/icrc.services';
	import {
		IC_TOKEN_FEE_CONTEXT_KEY,
		type IcTokenFeeContext as IcTokenFeeContextType
	} from '$icp/stores/ic-token-fee.store';
	import type { IcCkToken, IcToken } from '$icp/types/ic-token';
	import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
	import { isIcToken } from '$icp/validation/ic-token.validation';
	import SwapFees from '$lib/components/swap/SwapFees.svelte';
	import SwapProgress from '$lib/components/swap/SwapProgress.svelte';
	import SwapReview from '$lib/components/swap/SwapReview.svelte';
	import {
		TRACK_COUNT_SWAP_ERROR,
		TRACK_COUNT_SWAP_SUBMITTED,
		TRACK_COUNT_SWAP_SUCCESS
	} from '$lib/constants/analytics.constants';
	import { btcAddressMainnet, ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsSwap } from '$lib/enums/progress-steps';
	import { WizardStepsSwap } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { fetchChainFusionIcpSwap } from '$lib/services/chain-fusion-swap.services';
	import { fetchOisyTradeSwap } from '$lib/services/oisy-trade-swap.services';
	import { OisyTradeSwapError } from '$lib/services/swap-errors.services';
	import {
		enableSwapDestinationToken,
		fetchOneSecIcpToEvmSwap,
		swapService
	} from '$lib/services/swap.services';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext as SwapAmountsContextType
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { OptionAmount } from '$lib/types/send';
	import { SwapErrorCodes, SwapProvider } from '$lib/types/swap';
	import type { WizardStep } from '$lib/types/wizard';
	import { errorDetailToString } from '$lib/utils/error.utils';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isNetworkIdBitcoin } from '$lib/utils/network.utils';
	import { isSwapError } from '$lib/utils/swap.utils';

	interface Props {
		swapAmount: OptionAmount;
		receiveAmount?: number;
		slippageValue: OptionAmount;
		swapProgressStep: ProgressStepsSwap;
		swapFailedProgressSteps?: ProgressStepsSwap[];
		currentStep?: WizardStep;
		isSwapAmountsLoading: boolean;
		onShowTokensList: (tokenSource: 'source' | 'destination') => void;
		onShowProviderList: () => void;
		onClose: () => void;
		onNext: () => void;
		onBack: () => void;
	}
	let {
		swapAmount = $bindable(),
		receiveAmount = $bindable(),
		slippageValue = $bindable(),
		swapProgressStep = $bindable(),
		swapFailedProgressSteps = $bindable([]),
		currentStep,
		isSwapAmountsLoading,
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
		isSourceTokenIcrc2,
		setIsTokensIcrc2
	} = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { store: swapAmountsStore } = getContext<SwapAmountsContextType>(SWAP_AMOUNTS_CONTEXT_KEY);

	const { store: icTokenFeeStore } = getContext<IcTokenFeeContextType>(IC_TOKEN_FEE_CONTEXT_KEY);

	const progress = (step: ProgressStepsSwap) => (swapProgressStep = step);

	const setFailedProgressStep = (step: ProgressStepsSwap) => {
		if (!swapFailedProgressSteps.includes(step)) {
			swapFailedProgressSteps = [...swapFailedProgressSteps, step];
		}
	};

	let sourceTokenUsdValue = $derived(
		nonNullish($sourceTokenExchangeRate) && nonNullish($sourceToken) && nonNullish(swapAmount)
			? `${Number(swapAmount) * $sourceTokenExchangeRate}`
			: undefined
	);

	// 1Sec's background phase is a bridge; Chain Fusion's is a ck minter settling a
	// withdrawal, so it gets the plain background wording.
	let isOneSecProvider = $derived(
		$swapAmountsStore?.selectedProvider?.provider === SwapProvider.ONE_SEC
	);

	let isChainFusionProvider = $derived(
		$swapAmountsStore?.selectedProvider?.provider === SwapProvider.CHAIN_FUSION
	);

	// OISY Trade settles in the foreground: deposit, fill-or-kill order, and the
	// withdrawal that brings either leg back out of DEX custody, all inside the modal.
	// A fill-or-kill order is decided in the matching round after acceptance, so this is
	// seconds rather than the minutes a bridge takes — and staying in one session is
	// what keeps two OISY Trade swaps from overlapping, which their shared free balance
	// on the venue cannot tell apart. It is deliberately absent from
	// `isActiveTransactionSwap` below; its row is a recovery record for a session that
	// dies mid-flow, not a hand-off.
	let oisyTradeDetails = $derived(
		$swapAmountsStore?.selectedProvider?.provider === SwapProvider.OISY_TRADE
			? $swapAmountsStore.selectedProvider.swapDetails
			: undefined
	);

	// The user's own address on the destination chain, which is where the minter pays the
	// withdrawal out. Bitcoin and Ethereum are the only ck destinations.
	let isBitcoinDestination = $derived(isNetworkIdBitcoin($destinationToken?.network.id));

	let destinationAddress = $derived(isBitcoinDestination ? $btcAddressMainnet : $ethAddress);

	// These close the modal once the funds have left the wallet and finish settling through
	// the Active User Transactions store — every ck withdrawal included, whichever minter
	// pays it out.
	let isActiveTransactionSwap = $derived(isOneSecProvider || isChainFusionProvider);

	$effect(() => {
		if (isNullish($sourceToken) || !isIcToken($sourceToken)) {
			return;
		}

		if (isNullish($isSourceTokenIcrc2)) {
			(async () => {
				const isIcrc2Supported = await isIcrcTokenSupportIcrc2({
					identity: $authIdentity,
					ledgerCanisterId: $sourceToken.ledgerCanisterId
				});

				setIsTokensIcrc2({
					ledgerCanisterId: $sourceToken.ledgerCanisterId,
					isIcrc2Supported
				});
			})();
		}
	});

	const clearFailedProgressStep = () => {
		swapFailedProgressSteps = [];
	};

	let sourceTokenFee = $derived(
		nonNullish($sourceToken) && nonNullish($icTokenFeeStore)
			? $icTokenFeeStore[$sourceToken.symbol]
			: undefined
	);

	const swap = async () => {
		if (isNullish($authIdentity)) {
			return;
		}

		if (
			isNullish($sourceToken) ||
			isNullish($destinationToken) ||
			isNullish(slippageValue) ||
			isNullish(swapAmount) ||
			isNullish(sourceTokenFee) ||
			isNullish($swapAmountsStore?.selectedProvider?.receiveAmount) ||
			isNullish($swapAmountsStore?.selectedProvider?.provider) ||
			isNullish($isSourceTokenIcrc2)
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

		const sourceLedgerCanisterId = ($sourceToken as IcToken).ledgerCanisterId;
		const destinationLedgerCanisterId = isIcToken($destinationToken)
			? $destinationToken.ledgerCanisterId
			: '';

		onNext();

		try {
			clearFailedProgressStep();

			if ($swapAmountsStore.selectedProvider.provider === SwapProvider.ONE_SEC) {
				if (!isTokenErc20($destinationToken) || isNullish($ethAddress)) {
					toastsError({
						msg: { text: $i18n.swap.error.unexpected_missing_data }
					});
					onBack();
					return;
				}

				await fetchOneSecIcpToEvmSwap({
					identity: $authIdentity,
					progress,
					sourceToken: $sourceToken as IcToken,
					destinationToken: $destinationToken,
					swapAmount,
					userEthAddress: $ethAddress,
					setFailedProgressStep,
					swapId: crypto.randomUUID()
				});
			} else if ($swapAmountsStore.selectedProvider.provider === SwapProvider.OISY_TRADE) {
				// Dispatched explicitly rather than through `swapService`, like 1Sec and Chain
				// Fusion above: the reviewed order — side, price, quantity, deposit amount —
				// cannot travel through `SwapParams`, and re-deriving it here would let the book
				// move between Review and submit.
				if (isNullish(oisyTradeDetails) || !isIcToken($destinationToken)) {
					toastsError({
						msg: { text: $i18n.swap.error.unexpected_missing_data }
					});
					onBack();
					return;
				}

				await fetchOisyTradeSwap({
					identity: $authIdentity,
					progress,
					swapId: crypto.randomUUID(),
					sourceToken: $sourceToken as IcToken,
					destinationToken: $destinationToken,
					order: oisyTradeDetails.order,
					usdSourceValue: sourceTokenUsdValue,
					enableDestinationToken: () =>
						enableSwapDestinationToken({
							destinationToken: $destinationToken,
							identity: $authIdentity
						})
				});
			} else if ($swapAmountsStore.selectedProvider.provider === SwapProvider.CHAIN_FUSION) {
				if (isNullish(destinationAddress)) {
					toastsError({
						msg: { text: $i18n.swap.error.unexpected_missing_data }
					});
					onBack();
					return;
				}

				await fetchChainFusionIcpSwap({
					identity: $authIdentity,
					progress,
					sourceToken: $sourceToken as IcCkToken,
					destinationToken: $destinationToken,
					swapAmount,
					destinationAddress,
					swapId: crypto.randomUUID(),
					usdSourceValue: sourceTokenUsdValue,
					enableDestinationToken: () =>
						enableSwapDestinationToken({
							destinationToken: $destinationToken,
							identity: $authIdentity
						})
				});
			} else {
				await swapService[$swapAmountsStore.selectedProvider.provider]({
					identity: $authIdentity,
					progress,
					sourceToken: $sourceToken as IcTokenToggleable,
					destinationToken: $destinationToken as IcTokenToggleable,
					swapAmount,
					receiveAmount: $swapAmountsStore.selectedProvider.receiveAmount,
					slippageValue,
					sourceTokenFee,
					isSourceTokenIcrc2: $isSourceTokenIcrc2,
					setFailedProgressStep,
					tryToWithdraw:
						nonNullish($failedSwapError?.errorType) &&
						($failedSwapError?.errorType === SwapErrorCodes.SWAP_FAILED_WITHDRAW_FAILED ||
							$failedSwapError?.errorType === SwapErrorCodes.SWAP_SUCCESS_WITHDRAW_FAILED ||
							$failedSwapError?.errorType === SwapErrorCodes.ICP_SWAP_WITHDRAW_FAILED),
					withdrawDestinationTokens:
						nonNullish($failedSwapError?.errorType) &&
						($failedSwapError?.errorType === SwapErrorCodes.SWAP_SUCCESS_WITHDRAW_FAILED ||
							$failedSwapError?.swapSucceded)
				});
			}

			progress(ProgressStepsSwap.DONE);

			// For OneSec and Chain Fusion, the foreground completes once the user's funds
			// have left their wallet; success/failure of the background phase is tracked
			// separately via the AUT store. Other providers (ICPSwap, KongSwap) still
			// complete fully inside `await` and reach this point only on success.
			trackEvent({
				name: isActiveTransactionSwap ? TRACK_COUNT_SWAP_SUBMITTED : TRACK_COUNT_SWAP_SUCCESS,
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
			}, 2500);
		} catch (err: unknown) {
			const errorDetail = errorDetailToString(err);

			if (isSwapError(err)) {
				failedSwapError.set({
					message: err.message,
					variant: err.variant ?? 'info',
					errorType: err.code,
					swapSucceded: err.swapSucceded,
					url: {
						url: `https://app.icpswap.com/swap?input=${sourceLedgerCanisterId}&output=${destinationLedgerCanisterId}`,
						text: 'icpswap.com'
					}
				});
				// TODO: Add unit tests to cover failed swap error scenarios
			} else if (nonNullish(errorDetail) && errorDetail.startsWith('Slippage exceeded.')) {
				failedSwapError.set({
					message: replacePlaceholders(
						replaceOisyPlaceholders($i18n.swap.error.slippage_exceeded),
						{
							$maxSlippage: slippageValue.toString()
						}
					),
					variant: 'info'
				});
			} else if (err instanceof OisyTradeSwapError) {
				// A killed fill-or-kill order, one the canister refused, and a swap that
				// could not be tracked at all are all expected outcomes with the user's
				// funds in their wallet by the time they are thrown — so they read as info
				// in Review, like slippage, never as an unexpected-error toast. The two
				// kinds that leave something unaccounted for at the venue ask the user to
				// check the Trading tab, hence the warning level.
				failedSwapError.set({
					message: err.message,
					variant: err.kind === 'recovery_failed' || err.kind === 'unresolved' ? 'warning' : 'info'
				});
			} else {
				failedSwapError.set(undefined);
				toastsError({
					msg: { text: $i18n.swap.error.unexpected },
					err
				});
			}

			// `not_placed` is the one OISY Trade outcome the row reports instead of this
			// wizard: the flow terminalizes that row `Failed` itself, and the loader fires
			// the swap's single error event off it, so firing here too would count the same
			// swap twice. Every other kind reports from here — including `recovery_failed`,
			// which deliberately leaves its row non-terminal so the poller keeps trying:
			// nothing would report it until a later session finished the row, or ever if
			// none did, and it is the one kind raised with the user's funds still at the
			// venue.
			const isReportedByRow = err instanceof OisyTradeSwapError && err.kind === 'not_placed';

			if (
				!(
					isSwapError(err) &&
					(err.code === SwapErrorCodes.ICP_SWAP_WITHDRAW_SUCCESS ||
						err.code === SwapErrorCodes.ICP_SWAP_WITHDRAW_FAILED)
				) &&
				!isReportedByRow
			) {
				trackEvent({
					name: TRACK_COUNT_SWAP_ERROR,
					metadata: {
						...swapTrackingMetadata,
						errorKey: isSwapError(err)
							? err.code
							: err instanceof OisyTradeSwapError
								? err.kind
								: ''
					}
				});
			}

			setTimeout(() => onBack(), 2000);
		}
	};
</script>

<IcTokenFeeContext token={$sourceToken as IcToken}>
	{#key currentStep?.name}
		{#if currentStep?.name === WizardStepsSwap.SWAP}
			<SwapIcpForm
				{isSwapAmountsLoading}
				{onClose}
				{onNext}
				{onShowProviderList}
				{onShowTokensList}
				{sourceTokenFee}
				bind:swapAmount
				bind:receiveAmount
				bind:slippageValue
			/>
		{:else if currentStep?.name === WizardStepsSwap.REVIEW}
			<SwapReview {onBack} onSwap={swap} {receiveAmount} {slippageValue} {swapAmount}>
				{#snippet swapFees()}
					<SwapFees />
				{/snippet}
			</SwapReview>
		{:else if currentStep?.name === WizardStepsSwap.SWAPPING}
			<SwapProgress
				{swapProgressStep}
				swapWithActiveTransaction={isActiveTransactionSwap}
				swapWithBridging={isOneSecProvider}
				swapWithWithdrawing={$swapAmountsStore?.selectedProvider?.provider ===
					SwapProvider.ICP_SWAP || nonNullish(oisyTradeDetails)}
				withApproveStep={nonNullish(oisyTradeDetails)}
				bind:failedSteps={swapFailedProgressSteps}
			/>
		{/if}
	{/key}
</IcTokenFeeContext>
