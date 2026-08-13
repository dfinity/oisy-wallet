<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, setContext, untrack } from 'svelte';
	import { writable } from 'svelte/store';
	import EthFeeContext from '$eth/components/fee/EthFeeContext.svelte';
	import HarvestStakeForm from '$eth/components/stake/harvest-autopilot/HarvestStakeForm.svelte';
	import HarvestStakeReview from '$eth/components/stake/harvest-autopilot/HarvestStakeReview.svelte';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import { depositErc4626, toggleErc4626Token } from '$eth/services/erc4626.services';
	import {
		ETH_FEE_CONTEXT_KEY,
		type EthFeeContext as FeeContextType,
		initEthFeeContext,
		initEthFeeStore
	} from '$eth/stores/eth-fee.store';
	import type { Erc20Token } from '$eth/types/erc20';
	import type { EthereumNetwork } from '$eth/types/network';
	import { getHarvestAutopilotBaseTrackingMetadata } from '$eth/utils/harvest-autopilots.utils';
	import { enabledEvmTokens } from '$evm/derived/tokens.derived';
	import StakeProgress from '$lib/components/stake/StakeProgress.svelte';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { PLAUSIBLE_EVENT_RESULT_STATUSES, PLAUSIBLE_EVENTS } from '$lib/enums/plausible';
	import { ProgressStepsStake } from '$lib/enums/progress-steps';
	import { WizardStepsStake } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { TokenId } from '$lib/types/token';
	import type { Vault } from '$lib/types/vaults';
	import type { WizardStep } from '$lib/types/wizard';
	import { errorDetailToString } from '$lib/utils/error.utils';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	interface Props {
		amount: OptionAmount;
		stakeProgressStep: string;
		vault: Vault;
		currentStep?: WizardStep;
		onClose: () => void;
		onBack: () => void;
		onNext: () => void;
	}

	let {
		amount = $bindable(),
		stakeProgressStep = $bindable(),
		vault,
		currentStep,
		onClose,
		onNext,
		onBack
	}: Props = $props();

	const { sendTokenDecimals, sendToken, sendTokenId, sendTokenExchangeRate } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	let sourceNetwork = $derived($sendToken.network as EthereumNetwork);

	/**
	 * Fee context store
	 */
	const feeStore = initEthFeeStore();

	let nativeEthereumToken = $derived(
		[...$enabledEvmTokens, ...$enabledEthereumTokens].find(
			({ network: { id: networkId } }) => $sendToken.network.id === networkId
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

	$effect(() => {
		amount;

		untrack(() => evaluateFee());
	});

	let estimatedSharesToReceive = $state<OptionAmount>();

	const stake = async () => {
		if (isNullish($authIdentity)) {
			return;
		}

		if (invalidAmount(amount) || isNullish(amount)) {
			toastsError({
				msg: { text: $i18n.send.assertion.amount_invalid }
			});
			return;
		}

		if (isNullish($ethAddress)) {
			toastsError({
				msg: { text: $i18n.send.assertion.address_unknown }
			});
			return;
		}

		if (isNullish($feeStore)) {
			toastsError({
				msg: { text: $i18n.send.assertion.gas_fees_not_defined }
			});
			return;
		}

		const { maxFeePerGas, maxPriorityFeePerGas, gas } = $feeStore;

		if (isNullish(maxFeePerGas) || isNullish(maxPriorityFeePerGas)) {
			toastsError({
				msg: { text: $i18n.send.assertion.max_gas_fee_per_gas_undefined }
			});
			return;
		}

		onNext();

		const startTime = performance.now();

		const trackEventBaseParams = {
			...getHarvestAutopilotBaseTrackingMetadata({
				assetToken: $sendToken as Erc20Token,
				vaultToken: vault.token
			}),
			token_amount: `${amount}`,
			...(nonNullish($sendTokenExchangeRate)
				? {
						token_usd_value: `${Number(amount) * $sendTokenExchangeRate}`,
						token_usd_price: `${$sendTokenExchangeRate}`
					}
				: {}),
			...(nonNullish(estimatedSharesToReceive)
				? { token2_amount: `${estimatedSharesToReceive}` }
				: {})
		};

		try {
			await depositErc4626({
				identity: $authIdentity,
				vault,
				assetToken: $sendToken as Erc20Token,
				amount: parseToken({
					value: `${amount}`,
					unitName: $sendTokenDecimals
				}),
				from: $ethAddress,
				gas,
				maxFeePerGas,
				maxPriorityFeePerGas,
				progress: (step: ProgressStepsStake) => (stakeProgressStep = step)
			});

			const duration = performance.now() - startTime;
			const durationInSeconds = duration / 1000;

			trackEvent({
				name: PLAUSIBLE_EVENTS.STAKE,
				metadata: {
					...trackEventBaseParams,
					result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
					result_duration_in_seconds: `${durationInSeconds}`,
					result_duration_in_seconds_rounded: `${Math.round(durationInSeconds)}`
				}
			});

			try {
				if (!vault.token.enabled) {
					await toggleErc4626Token({
						token: vault.token,
						identity: $authIdentity,
						enabled: true
					});
				}
			} catch {
				// if enabling failed, we just proceed with the modal closing
			}

			stakeProgressStep = ProgressStepsStake.DONE;

			setTimeout(() => onClose(), 750);
		} catch (error: unknown) {
			const duration = performance.now() - startTime;
			const durationInSeconds = duration / 1000;
			const errorMessage =
				errorDetailToString(error) ?? $i18n.stake.error.unexpected_error_on_stake;
			const errorName = error instanceof Error ? error.name : undefined;
			const errorCode = (error as { code?: string }).code;

			trackEvent({
				name: PLAUSIBLE_EVENTS.STAKE,
				metadata: {
					...trackEventBaseParams,
					result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
					result_duration_in_seconds: `${durationInSeconds}`,
					result_duration_in_seconds_rounded: `${Math.round(durationInSeconds)}`,
					result_error_text: errorMessage,
					...(nonNullish(errorName) ? { result_error: errorName } : {}),
					...(nonNullish(errorCode) ? { result_error_code: errorCode } : {})
				}
			});

			toastsError({
				msg: { text: $i18n.stake.error.unexpected_error_on_stake },
				err: error
			});

			onBack();
		}
	};
</script>

{#if nonNullish(nativeEthereumToken)}
	<EthFeeContext
		bind:this={feeContext}
		{amount}
		erc4626ContractAddress={vault.token.address}
		{nativeEthereumToken}
		observe={currentStep?.name !== WizardStepsStake.STAKING}
		sendToken={$sendToken}
		sendTokenId={$sendTokenId}
		{sourceNetwork}
	>
		{#key currentStep?.name}
			{#if currentStep?.name === WizardStepsStake.STAKE}
				<HarvestStakeForm {onClose} {onNext} {vault} bind:amount bind:estimatedSharesToReceive />
			{:else if currentStep?.name === WizardStepsStake.REVIEW}
				<HarvestStakeReview {amount} {onBack} onStake={stake} {vault} />
			{:else if currentStep?.name === WizardStepsStake.STAKING}
				<StakeProgress {stakeProgressStep} />
			{/if}
		{/key}
	</EthFeeContext>
{/if}
