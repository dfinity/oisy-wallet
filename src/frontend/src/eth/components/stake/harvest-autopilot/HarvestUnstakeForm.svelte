<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import HarvestStakeFees from '$eth/components/stake/harvest-autopilot/HarvestStakeFees.svelte';
	import { ETH_FEE_CONTEXT_KEY, type EthFeeContext } from '$eth/stores/eth-fee.store';
	import StakeForm from '$lib/components/stake/StakeForm.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { balancesStore } from '$lib/stores/balances.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { TokenActionErrorType } from '$lib/types/token-action';
	import { parseToken } from '$lib/utils/parse.utils';
	import { validateUserAmount } from '$lib/utils/user-amount.utils';

	interface Props {
		amount: OptionAmount;
		onClose: () => void;
		onNext: () => void;
	}

	let { amount = $bindable(), onNext, onClose }: Props = $props();

	const { sendToken, sendBalance } = getContext<SendContext>(SEND_CONTEXT_KEY);
	const { maxGasFee, feeTokenIdStore } = getContext<EthFeeContext>(ETH_FEE_CONTEXT_KEY);

	let errorType = $state<TokenActionErrorType | undefined>();

	const customValidate = (userAmount: bigint): TokenActionErrorType | undefined => {
		const amountError = validateUserAmount({
			userAmount,
			token: $sendToken,
			balance: $sendBalance ?? ZERO
		});

		if (nonNullish(amountError)) {
			return amountError;
		}

		if (nonNullish($feeTokenIdStore) && nonNullish($maxGasFee)) {
			const nativeBalance = $balancesStore?.[$feeTokenIdStore]?.data ?? ZERO;
			if (nativeBalance < $maxGasFee) {
				return 'insufficient-funds-for-fee';
			}
		}
	};

	$effect(() => {
		if (nonNullish($sendToken) && nonNullish(amount)) {
			const parsedAmount = parseToken({
				value: `${amount}`,
				unitName: $sendToken.decimals
			});

			const newErrorType = customValidate(parsedAmount);
			if (newErrorType !== errorType) {
				errorType = newErrorType;
			}
		}
	});
</script>

<StakeForm
	disabled={isNullish($maxGasFee)}
	{errorType}
	{onClose}
	onCustomValidate={customValidate}
	{onNext}
	totalFee={ZERO}
	bind:amount
>
	{#snippet content()}
		<HarvestStakeFees />
	{/snippet}
</StakeForm>
