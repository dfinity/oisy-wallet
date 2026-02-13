<script lang="ts">
	import { getContext } from 'svelte';
	import GldtStakeFees from '$icp/components/stake/gldt/GldtStakeFees.svelte';
	import GldtStakeProvider from '$icp/components/stake/gldt/GldtStakeProvider.svelte';
	import type { IcToken } from '$icp/types/ic-token';
	import StakeForm from '$lib/components/stake/StakeForm.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { Address } from '$lib/types/address';
	import type { OptionAmount } from '$lib/types/send';
	import type { TokenActionErrorType } from '$lib/types/token-action';
	import { validateUserAmount } from '$lib/utils/user-amount.utils';

	interface Props {
		amount: OptionAmount;
		destination: Address;
		onClose: () => void;
		onNext: () => void;
	}

	let { amount = $bindable(), destination, onNext, onClose }: Props = $props();

	const { sendToken, sendBalance } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let totalFee = $derived(($sendToken as IcToken).fee * 2n);

	const onCustomValidate = (userAmount: bigint): TokenActionErrorType =>
		validateUserAmount({
			userAmount,
			token: $sendToken,
			balance: $sendBalance ?? ZERO,
			fee: totalFee
		});
</script>

<StakeForm {destination} {onClose} {onCustomValidate} {onNext} {totalFee} bind:amount>
	{#snippet provider()}
		<GldtStakeProvider />
	{/snippet}

	{#snippet fee()}
		<GldtStakeFees />
	{/snippet}
</StakeForm>
