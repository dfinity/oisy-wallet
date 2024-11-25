<script lang="ts">
	import ConvertAmountDestination from '$lib/components/convert/ConvertAmountDestination.svelte';
	import ConvertAmountSource from '$lib/components/convert/ConvertAmountSource.svelte';
	import IconMoveDown from '$lib/components/icons/lucide/IconMoveDown.svelte';
	import type { OptionAmount } from '$lib/types/send';

	export let sendAmount: OptionAmount;
	export let receiveAmount: number | undefined;
	export let totalFee: bigint | undefined;
	export let insufficientFunds: boolean;
	export let insufficientFundsForFee: boolean;
</script>

<ConvertAmountSource
	bind:sendAmount
	bind:insufficientFunds
	bind:insufficientFundsForFee
	{totalFee}
/>

<div class="my-4 flex justify-center">
	<div class="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
		<IconMoveDown />
	</div>
</div>

<ConvertAmountDestination bind:receiveAmount {sendAmount} {totalFee} {insufficientFunds} />
