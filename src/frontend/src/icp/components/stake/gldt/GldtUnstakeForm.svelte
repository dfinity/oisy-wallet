<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import GldtUnstakeDissolveTypeSelector from '$icp/components/stake/gldt/GldtUnstakeDissolveTypeSelector.svelte';
	import StakeForm from '$lib/components/stake/StakeForm.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { TokenActionErrorType } from '$lib/types/token-action';
	import { validateUserAmount } from '$lib/utils/user-amount.utils';

	interface Props {
		amount: OptionAmount;
		amountToReceive?: number;
		dissolveInstantly: boolean;
		onClose: () => void;
		onNext: () => void;
	}

	let {
		amount = $bindable(),
		onNext,
		onClose,
		dissolveInstantly = $bindable(),
		amountToReceive = $bindable()
	}: Props = $props();

	const { sendToken, sendBalance } = getContext<SendContext>(SEND_CONTEXT_KEY);

	const onCustomValidate = (userAmount: bigint): TokenActionErrorType =>
		validateUserAmount({
			userAmount,
			token: $sendToken,
			balance: $sendBalance ?? ZERO
		});

	let disabled = $derived(isNullish(amountToReceive) || amountToReceive <= 0);
</script>

<StakeForm {disabled} {onClose} {onCustomValidate} {onNext} totalFee={ZERO} bind:amount>
	{#snippet fee()}
		<GldtUnstakeDissolveTypeSelector {amount} bind:dissolveInstantly bind:amountToReceive />
	{/snippet}
</StakeForm>
