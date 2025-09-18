<script lang="ts">
	import ConvertAmountDestination from '$lib/components/convert/ConvertAmountDestination.svelte';
	import ConvertAmountSource from '$lib/components/convert/ConvertAmountSource.svelte';
	import IconMoveDown from '$lib/components/icons/lucide/IconMoveDown.svelte';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';

	interface Props {
		sendAmount: OptionAmount;
		receiveAmount: number | undefined;
		totalFee: bigint | undefined;
		destinationTokenFee?: bigint;
		minFee?: bigint;
		ethereumEstimateFee?: bigint;
		exchangeValueUnit?: DisplayUnit;
	}

	let {
		sendAmount = $bindable(),
		receiveAmount = $bindable(),
		totalFee,
		destinationTokenFee = undefined,
		minFee = undefined,
		ethereumEstimateFee = undefined,
		exchangeValueUnit = $bindable('usd')
	}: Props = $props();

	let inputUnit: DisplayUnit = $derived(exchangeValueUnit === 'token' ? 'usd' : 'token');
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
