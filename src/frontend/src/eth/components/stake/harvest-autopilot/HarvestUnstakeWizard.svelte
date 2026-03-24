<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, setContext, untrack } from 'svelte';
	import { writable } from 'svelte/store';
	import EthFeeContext from '$eth/components/fee/EthFeeContext.svelte';
	import HarvestUnstakeForm from '$eth/components/stake/harvest-autopilot/HarvestUnstakeForm.svelte';
	import HarvestUnstakeReview from '$eth/components/stake/harvest-autopilot/HarvestUnstakeReview.svelte';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import { redeemErc4626, withdrawErc4626 } from '$eth/services/erc4626.services';
	import {
		ETH_FEE_CONTEXT_KEY,
		type EthFeeContext as FeeContextType,
		initEthFeeContext,
		initEthFeeStore
	} from '$eth/stores/eth-fee.store';
	import type { EthereumNetwork } from '$eth/types/network';
	import { enabledEvmTokens } from '$evm/derived/tokens.derived';
	import UnstakeProgress from '$lib/components/stake/UnstakeProgress.svelte';
	import {
		TRACK_COUNT_UNSTAKE_ERROR,
		TRACK_COUNT_UNSTAKE_SUCCESS
	} from '$lib/constants/analytics.constants';
	import { ZERO } from '$lib/constants/app.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { ProgressStepsUnstake } from '$lib/enums/progress-steps';
	import { WizardStepsUnstake } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { TokenId } from '$lib/types/token';
	import type { Vault } from '$lib/types/vaults';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	interface Props {
		amount: OptionAmount;
		unstakeProgressStep: string;
		vault: Vault;
		currentStep?: WizardStep;
		onClose: () => void;
		onBack: () => void;
		onNext: () => void;
	}

	let {
		amount = $bindable(),
		unstakeProgressStep = $bindable(),
		vault,
		currentStep,
		onClose,
		onNext,
		onBack
	}: Props = $props();

	let amountSetToMax = $state(false);

	const { sendTokenDecimals, sendTokenSymbol, sendToken, sendTokenId, sendBalance } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	let isMaxAmount = $derived.by(() => {
		if (amountSetToMax) {
			return true;
		}

		if (isNullish(amount) || isNullish($sendBalance) || invalidAmount(amount)) {
			return false;
		}

		const parsedAmount = parseToken({ value: `${amount}`, unitName: $sendTokenDecimals });

		return parsedAmount === $sendBalance;
	});

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

	const unstake = async () => {
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

		try {
			const feeParams = {
				identity: $authIdentity,
				vault,
				from: $ethAddress,
				gas,
				maxFeePerGas,
				maxPriorityFeePerGas,
				progress: (step: ProgressStepsUnstake) => (unstakeProgressStep = step)
			};

			if (isMaxAmount && nonNullish(vault.token.balance)) {
				await redeemErc4626({
					...feeParams,
					shares: vault.token.balance
				});
			} else {
				await withdrawErc4626({
					...feeParams,
					assets: parseToken({
						value: `${amount}`,
						unitName: $sendTokenDecimals
					})
				});
			}

			trackEvent({
				name: TRACK_COUNT_UNSTAKE_SUCCESS,
				metadata: {
					token: $sendTokenSymbol
				}
			});

			unstakeProgressStep = ProgressStepsUnstake.DONE;

			setTimeout(() => onClose(), 750);
		} catch (err: unknown) {
			trackEvent({
				name: TRACK_COUNT_UNSTAKE_ERROR,
				metadata: {
					token: $sendTokenSymbol
				}
			});

			toastsError({
				msg: { text: $i18n.stake.error.unexpected_error_on_unstake },
				err
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
		erc4626Operation={isMaxAmount ? 'redeem' : 'withdraw'}
		erc4626Shares={vault.token.balance ?? ZERO}
		maxAmount={nonNullish($sendBalance) ? $sendBalance : undefined}
		{nativeEthereumToken}
		observe={currentStep?.name !== WizardStepsUnstake.UNSTAKING}
		sendToken={$sendToken}
		sendTokenId={$sendTokenId}
		{sourceNetwork}
	>
		{#key currentStep?.name}
			{#if currentStep?.name === WizardStepsUnstake.UNSTAKE}
				<HarvestUnstakeForm {onClose} {onNext} bind:amount bind:amountSetToMax />
			{:else if currentStep?.name === WizardStepsUnstake.REVIEW}
				<HarvestUnstakeReview {amount} {onBack} onUnstake={unstake} />
			{:else if currentStep?.name === WizardStepsUnstake.UNSTAKING}
				<UnstakeProgress {unstakeProgressStep} />
			{/if}
		{/key}
	</EthFeeContext>
{/if}
