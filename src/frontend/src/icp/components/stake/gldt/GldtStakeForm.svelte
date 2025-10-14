<script lang="ts">
	import { getContext } from 'svelte';
	import GldtStakeFees from '$icp/components/stake/gldt/GldtStakeFees.svelte';
	import type { IcToken } from '$icp/types/ic-token';
	import StakeForm from '$lib/components/stake/StakeForm.svelte';
	import StakeProvider from '$lib/components/stake/StakeProvider.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { OptionAmount } from '$lib/types/send';
	import { StakeProvider as StakeProviderType } from '$lib/types/stake';
	import type { TokenActionErrorType } from '$lib/types/token-action';
	import { validateUserAmount } from '$lib/utils/user-amount.utils';

	interface Props {
		amount: OptionAmount;
		onClose: () => void;
		onNext: () => void;
	}

	let { amount = $bindable(), onNext, onClose }: Props = $props();

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

<StakeForm {onClose} {onCustomValidate} {onNext} {totalFee} bind:amount>
	{#snippet provider()}
		<StakeProvider provider={StakeProviderType.GLDT} />
	{/snippet}

	{#snippet fee()}
		<GldtStakeFees />
	{/snippet}
</StakeForm>
