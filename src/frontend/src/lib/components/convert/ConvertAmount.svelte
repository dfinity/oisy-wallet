<script lang="ts">
	import ConvertAmountDestination from '$lib/components/convert/ConvertAmountDestination.svelte';
	import ConvertAmountSource from '$lib/components/convert/ConvertAmountSource.svelte';
	import IconMoveDown from '$lib/components/icons/lucide/IconMoveDown.svelte';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';

	export let sendAmount: OptionAmount;
	export let receiveAmount: number | undefined;
	export let totalFee: bigint | undefined;
	export let destinationTokenFee: bigint | undefined = undefined;
	export let minFee: bigint | undefined = undefined;
	export let ethereumEstimateFee: bigint | undefined = undefined;
	export let exchangeValueUnit: DisplayUnit = 'usd';

	let inputUnit: DisplayUnit;
	$: inputUnit = exchangeValueUnit === 'token' ? 'usd' : 'token';
</script>

<div class="relative">
	<div class="mb-2">
		<ConvertAmountSource
			{ethereumEstimateFee}
			{inputUnit}
			{minFee}
			{totalFee}
			bind:sendAmount
			bind:exchangeValueUnit
		/>
	</div>

	<div
		class="absolute bottom-0 left-0 right-0 top-0 m-auto flex h-9 w-9 items-center justify-center rounded-lg border border-solid border-secondary bg-surface shadow-sm"
	>
		<IconMoveDown />
	</div>

	<ConvertAmountDestination
		{destinationTokenFee}
		{inputUnit}
		{sendAmount}
		bind:receiveAmount
		bind:exchangeValueUnit
	/>
</div>
