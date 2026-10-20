<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, setContext, untrack } from 'svelte';
	import { writable } from 'svelte/store';
	import { ICP_NETWORK } from '$env/networks/networks.icp.env';
	import { NEAR_INTENTS_SWAP_ENABLED } from '$env/rest/near-intents.env';
	import { ETHEREUM_TOKEN_ID } from '$env/tokens/tokens.eth.env';
	import EthFeeContext from '$eth/components/fee/EthFeeContext.svelte';
	import EthFeeDisplay from '$eth/components/fee/EthFeeDisplay.svelte';
	import SwapEthForm from '$eth/components/swap/SwapEthForm.svelte';
	import SwapLifiFeeDisplay from '$eth/components/swap/SwapLifiFeeDisplay.svelte';
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
	import { isTokenErcFungible } from '$eth/utils/erc-fungible.utils';
	import { isTokenErc20 } from '$eth/utils/erc20.utils';
	import { mapEthereumErrorMsg } from '$eth/utils/eth-error.utils';
	import { isNotDefaultEthereumToken } from '$eth/utils/eth.utils';
	import { isIcToken } from '$icp/validation/ic-token.validation';
	import { assertCkEthMinterInfoLoaded } from '$icp-eth/services/cketh.services';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import {
		toCkErc20HelperContractAddress,
		toCkEthHelperContractAddress
	} from '$icp-eth/utils/cketh.utils';
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
	import { fungibleTokens } from '$lib/derived/tokens.derived';
	import { userProfileVersion } from '$lib/derived/user-profile.derived';
	import { hasAcknowledgedNearIntentsSwap } from '$lib/derived/user-provider-agreements.derived';
	import { ProgressStepsSwap } from '$lib/enums/progress-steps';
	import { WizardStepsSwap } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { fetchChainFusionEvmSwap } from '$lib/services/chain-fusion-swap.services';
	import {
		fetchLifiEvmSwap,
		lifiApprovalTransactions,
		lifiQuoteFeeCeiling
	} from '$lib/services/lifi-evm-swap.services';
	import { acceptProviderAgreement } from '$lib/services/provider-agreements.services';
	import {
		enableSwapDestinationToken,
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
	import { LifiFeeChangedError } from '$lib/types/errors';
	import type { OptionAmount } from '$lib/types/send';
	import { SwapProvider, VeloraSwapTypes } from '$lib/types/swap';
	import type { TokenId } from '$lib/types/token';
	import type { WizardStep } from '$lib/types/wizard';
	import { asCkTwinOf } from '$lib/utils/chain-fusion-swap.utils';
	import { consoleError } from '$lib/utils/console.utils';
	import { errorDetailToString } from '$lib/utils/error.utils';
	import { formatTokenBigintToNumber } from '$lib/utils/format.utils';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
	import { toLifiSwapErrorType } from '$lib/utils/lifi-swap-error.utils';
	import { lifiUserTokenAddresses } from '$lib/utils/lifi-swap.utils';
	import { isNetworkEthereum } from '$lib/utils/network.utils';
	import { nearIntentsQuoteRejectedMessage } from '$lib/utils/swap.utils';

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
				userAddress: $ethAddress,
				chainId: $sourceToken.network.chainId
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

	const { maxGasFee } = setContext<FeeContextType>(
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

	const isChainFusionProvider = $derived(
		$swapAmountsStore?.selectedProvider?.provider === SwapProvider.CHAIN_FUSION
	);

	const ckMinterInfo = $derived($ckEthMinterInfoStore?.[ETHEREUM_TOKEN_ID]);

	const ckHelperContractAddress = $derived(
		nonNullish($sourceToken) && isTokenErcFungible($sourceToken)
			? toCkErc20HelperContractAddress(ckMinterInfo)
			: toCkEthHelperContractAddress(ckMinterInfo)
	);

	const ckDepositDestination = $derived(
		isChainFusionProvider ? (ckHelperContractAddress ?? '') : ''
	);

	$effect(() => {
		[ckDepositDestination];

		untrack(() => evaluateFee());
	});

	const isOneSecProvider = $derived(
		$swapAmountsStore?.selectedProvider?.provider === SwapProvider.ONE_SEC
	);

	const lifiOffer = $derived(
		$swapAmountsStore?.selectedProvider?.provider === SwapProvider.LIFI
			? $swapAmountsStore.selectedProvider
			: undefined
	);

	const isLifiProvider = $derived(nonNullish(lifiOffer));

	// What LI.FI's fee is read for: the inputs of the quote, as its cache keys them. The bridges are
	// left out, which a re-quote without Across narrows for the same inputs.
	const lifiInputsKey = $derived(
		nonNullish(lifiOffer) ? JSON.stringify({ ...lifiOffer.request, allowBridges: [] }) : undefined
	);

	// The swap transaction's fee ceiling, priced from the displayed quote at OISY's fees.
	let lifiQuoteFee = $state<bigint | undefined>();
	let lifiQuoteFeeGeneration = 0;

	$effect(() => {
		const offer = lifiOffer;
		const token = $sourceToken;
		const maxFeePerGas = $feeStore?.maxFeePerGas;
		const maxPriorityFeePerGas = $feeStore?.maxPriorityFeePerGas;

		const generation = ++lifiQuoteFeeGeneration;

		if (
			isNullish(offer) ||
			isNullish(token) ||
			!isNetworkEthereum(token.network) ||
			isNullish(maxFeePerGas) ||
			isNullish(maxPriorityFeePerGas)
		) {
			lifiQuoteFee = undefined;

			return;
		}

		lifiQuoteFeeCeiling({
			quote: offer.swapDetails,
			sourceNetwork: token.network,
			maxFeePerGas,
			maxPriorityFeePerGas
		})
			.then((feeCeiling) => {
				if (generation === lifiQuoteFeeGeneration) {
					lifiQuoteFee = feeCeiling;
				}
			})
			.catch((err: unknown) => {
				consoleError(err);

				if (generation === lifiQuoteFeeGeneration) {
					lifiQuoteFee = undefined;
				}
			});
	});

	// The approvals an ERC-20 source needs, from one allowance read per set of inputs.
	let lifiApprovals = $state<0 | 1 | 2 | undefined>();
	let lifiApprovalsGeneration = 0;

	$effect(() => {
		// Read again for new inputs only, never for a re-quote of the same ones.
		[lifiInputsKey];

		untrack(() => {
			const generation = ++lifiApprovalsGeneration;

			lifiApprovals = undefined;

			if (
				isNullish(lifiOffer) ||
				isNullish($sourceToken) ||
				isNullish($ethAddress) ||
				!isNetworkEthereum($sourceToken.network)
			) {
				return;
			}

			lifiApprovalTransactions({
				sourceToken: $sourceToken as Erc20Token,
				userAddress: $ethAddress,
				amount: BigInt(lifiOffer.request.fromAmount),
				sourceNetwork: $sourceToken.network
			}).then((approvals) => {
				if (generation === lifiApprovalsGeneration) {
					lifiApprovals = approvals;
				}
			});
		});
	});

	// A ceiling that an execution found above the reviewed one, which the review then shows, for the
	// inputs it was found for.
	let lifiCarriedFee = $state<{ key: string; feeCeiling: bigint } | undefined>();

	const lifiReviewedFeeCeiling = $derived.by(() => {
		const carried = lifiCarriedFee?.key === lifiInputsKey ? lifiCarriedFee?.feeCeiling : undefined;

		if (isNullish(lifiQuoteFee) || isNullish(carried)) {
			return lifiQuoteFee ?? carried;
		}

		return carried > lifiQuoteFee ? carried : lifiQuoteFee;
	});

	// Each approval is a transaction priced as the fee context prices one: `approve()` signs it with
	// that gas.
	const lifiFee = $derived(
		nonNullish(lifiReviewedFeeCeiling) && nonNullish(lifiApprovals) && nonNullish($maxGasFee)
			? lifiReviewedFeeCeiling + BigInt(lifiApprovals) * $maxGasFee
			: undefined
	);

	// Velora, OneSec, NEAR Intents, Chain Fusion and LI.FI all close the modal at initiation
	// and settle in the background via the Active User Transactions store. Only the
	// ICP-native providers still complete inside the modal.
	const isActiveTransactionSwap = $derived(
		isNearIntentsProvider ||
			isOneSecProvider ||
			isChainFusionProvider ||
			isLifiProvider ||
			$swapAmountsStore?.selectedProvider?.provider === SwapProvider.VELORA
	);

	const isApproveNeeded = $derived(
		!isNearIntentsProvider &&
			$swapAmountsStore?.selectedProvider?.type === VeloraSwapTypes.MARKET &&
			isNotDefaultEthereumToken($sourceToken)
	);

	const swapEmitsApprovalSteps = $derived(
		!isNearIntentsProvider &&
			($swapAmountsStore?.selectedProvider?.provider === SwapProvider.VELORA ||
				isChainFusionProvider ||
				isLifiProvider) &&
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
					isGasless: $isSourceTokenPermitSupported ?? false
				};

				// `swapDetails` is spread inside each branch so that `type` narrows it to the quote
				// shape of the matching mode.
				if (selectedProvider.type === VeloraSwapTypes.DELTA) {
					await fetchVeloraDeltaSwap({ ...params, swapDetails: selectedProvider.swapDetails });
				} else {
					await fetchVeloraMarketSwap({ ...params, swapDetails: selectedProvider.swapDetails });
				}
			} else if (selectedProvider?.provider === SwapProvider.LIFI) {
				await fetchLifiEvmSwap({
					...baseParams,
					destinationToken: $destinationToken,
					offer: selectedProvider,
					reviewedFeeCeiling: lifiReviewedFeeCeiling,
					// Disabled ones too: hiding a token does not revoke its allowance to the Diamond.
					userTokenAddresses: lifiUserTokenAddresses({
						tokens: $fungibleTokens,
						networkId: $sourceToken.network.id
					})
				});
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
			} else if (selectedProvider?.provider === SwapProvider.CHAIN_FUSION) {
				if (isNullish(ckHelperContractAddress)) {
					toastsError({
						msg: { text: $i18n.send.assertion.address_unknown }
					});

					onBack();
					onStartTriggerAmount();

					return;
				}

				const { valid } = assertCkEthMinterInfoLoaded({
					minterInfo: ckMinterInfo,
					network: ICP_NETWORK
				});

				if (!valid) {
					onBack();
					onStartTriggerAmount();

					return;
				}

				// Re-resolved through the same pair oracle the quote used, so the row the
				// execution persists cannot disagree with the offer the user accepted about
				// which twin this is.
				const ckDestinationToken = asCkTwinOf({
					ckToken: $destinationToken,
					nativeToken: $sourceToken
				});

				if (isNullish(ckDestinationToken)) {
					toastsError({
						msg: { text: $i18n.swap.error.unexpected_missing_data }
					});

					onBack();
					onStartTriggerAmount();

					return;
				}

				await fetchChainFusionEvmSwap({
					identity: $authIdentity,
					progress,
					sourceToken: $sourceToken as Erc20Token,
					destinationToken: ckDestinationToken,
					swapAmount,
					userAddress: $ethAddress,
					helperContractAddress: ckHelperContractAddress,
					sourceNetwork: $sourceToken.network,
					minterInfo: ckMinterInfo,
					gas,
					maxFeePerGas,
					maxPriorityFeePerGas,
					swapId: crypto.randomUUID(),
					usdSourceValue: sourceTokenUsdValue,
					enableDestinationToken: () =>
						enableSwapDestinationToken({
							destinationToken: $destinationToken,
							identity: $authIdentity
						})
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

			// For AUT-tracked swaps the foreground completes once the swap is
			// committed — funds have left the wallet, or the order is live in the
			// auction; success/failure of the background phase is tracked separately
			// via the AUT store, so we fire `submitted` here. The ICP-native providers
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
			}, 750);
		} catch (err: unknown) {
			const errorDetail = errorDetailToString(err);

			trackEvent({
				name: TRACK_COUNT_SWAP_ERROR,
				metadata: {
					...swapTrackingMetadata,
					// LI.FI's error text can carry the user's addresses or signed transaction: only an
					// allow-listed category is reported.
					error:
						selectedProvider?.provider === SwapProvider.LIFI
							? toLifiSwapErrorType(err)
							: (errorDetail ?? '')
				}
			});

			if (err instanceof LifiFeeChangedError) {
				// Carried back to the review, which shows the higher fee for the user to confirm.
				if (nonNullish(lifiInputsKey)) {
					lifiCarriedFee = { key: lifiInputsKey, feeCeiling: err.feeCeiling };
				}

				failedSwapError.set({
					message: $i18n.swap.error.lifi_fee_changed,
					variant: 'info'
				});
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
			} else {
				failedSwapError.set({
					message:
						nearIntentsQuoteRejectedMessage(err) ??
						mapEthereumErrorMsg(err) ??
						$i18n.swap.error.failed_unexpectedly,
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
		destination={ckDepositDestination}
		{nativeEthereumToken}
		observe={currentStep?.name !== WizardStepsSwap.SWAPPING &&
			currentStep?.name !== WizardStepsSwap.REVIEW}
		sendToken={$sourceToken}
		sendTokenId={$sourceToken.id}
		sourceNetwork={$sourceToken.network}
		targetNetwork={isChainFusionProvider ? ICP_NETWORK : undefined}
	>
		{#key currentStep?.name}
			{#if currentStep?.name === WizardStepsSwap.SWAP}
				<SwapEthForm
					{isApproveNeeded}
					{isGasless}
					isLifi={isLifiProvider}
					{isSwapAmountsLoading}
					{lifiFee}
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
						{:else if isLifiProvider}
							<SwapLifiFeeDisplay fee={lifiFee}>
								{#snippet label()}
									<Html text={$i18n.fee.text.total_fee} />
								{/snippet}
							</SwapLifiFeeDisplay>
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
					sendWithTransfer={isTransferNeeded || isChainFusionProvider}
					{swapProgressStep}
					swapWithActiveTransaction={isActiveTransactionSwap}
					swapWithBridging={isOneSecProvider}
				/>
			{/if}
		{/key}
	</EthFeeContext>
{/if}
