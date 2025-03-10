<script lang="ts">
	import ConvertAmountDestination from '$lib/components/convert/ConvertAmountDestination.svelte';
	import ConvertAmountSource from '$lib/components/convert/ConvertAmountSource.svelte';
	import IconMoveDown from '$lib/components/icons/lucide/IconMoveDown.svelte';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';

	export let sendAmount: OptionAmount;
	export let receiveAmount: number | undefined;
	export let totalFee: bigint | undefined;
	export let minFee: bigint | undefined = undefined;
	export let ethereumEstimateFee: bigint | undefined = undefined;
	export let insufficientFunds: boolean;
	export let insufficientFundsForFee: boolean;
	export let amountLessThanLedgerFee: boolean | undefined = undefined;
	export let minimumAmountNotReached: boolean | undefined = undefined;
	export let unknownMinimumAmount: boolean | undefined = undefined;
	export let minterInfoNotCertified: boolean | undefined = undefined;
	export let exchangeValueUnit: DisplayUnit = 'usd';

	let inputUnit: DisplayUnit;
	$: inputUnit = exchangeValueUnit === 'token' ? 'usd' : 'token';
</script>

<div class="relative">
	<ConvertAmountSource
		bind:sendAmount
		bind:insufficientFunds
		bind:insufficientFundsForFee
		bind:amountLessThanLedgerFee
		bind:minimumAmountNotReached
		bind:unknownMinimumAmount
		bind:minterInfoNotCertified
		bind:exchangeValueUnit
		{inputUnit}
		{totalFee}
		{minFee}
		{ethereumEstimateFee}
	/>

	<div
		class="absolute bottom-0 left-0 right-0 top-0 m-auto flex h-9 w-9 items-center justify-center rounded-lg border border-solid border-secondary bg-surface shadow-sm"
	>
		<IconMoveDown />
	</div>

	<ConvertAmountDestination bind:receiveAmount bind:exchangeValueUnit {sendAmount} {inputUnit} />
</div>
