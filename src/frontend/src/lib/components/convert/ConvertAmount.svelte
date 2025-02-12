<script lang="ts">
	import ConvertAmountDestination from '$lib/components/convert/ConvertAmountDestination.svelte';
	import ConvertAmountSource from '$lib/components/convert/ConvertAmountSource.svelte';
	import IconMoveDown from '$lib/components/icons/lucide/IconMoveDown.svelte';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';

	export let sendAmount: OptionAmount;
	export let receiveAmount: number | undefined;
	export let totalFee: bigint | undefined;
	export let insufficientFunds: boolean;
	export let insufficientFundsForFee: boolean;
	export let exchangeValueUnit: DisplayUnit = 'usd';

	let inputUnit: DisplayUnit;
	$: inputUnit = exchangeValueUnit === 'token' ? 'usd' : 'token';
</script>

<div class="relative">
	<ConvertAmountSource
		bind:sendAmount
		bind:insufficientFunds
		bind:insufficientFundsForFee
		bind:exchangeValueUnit
		{inputUnit}
		{totalFee}
	/>

	<div
		class="top-0 right-0 bottom-0 left-0 h-9 w-9 rounded-lg shadow-sm absolute m-auto flex items-center justify-center border border-solid border-secondary bg-white"
	>
		<IconMoveDown />
	</div>

	<ConvertAmountDestination bind:receiveAmount bind:exchangeValueUnit {sendAmount} {inputUnit} />
</div>
