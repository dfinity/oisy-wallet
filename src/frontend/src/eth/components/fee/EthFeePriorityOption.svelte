<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import type { EthFeePriority } from '$lib/enums/eth-fee-priority';

	interface Props {
		priority: EthFeePriority;
		name: string;
		description: string;
		emoji: string;
		selected: boolean;
		fee?: bigint;
		symbol: string;
		decimals: number;
		exchangeRate?: number;
		groupName: string;
		testId?: string;
		onSelect: (priority: EthFeePriority) => void;
	}

	let {
		priority,
		name,
		description,
		emoji,
		selected,
		fee,
		symbol,
		decimals,
		exchangeRate,
		groupName,
		testId,
		onSelect
	}: Props = $props();

	const inputId = $derived(`${groupName}-${priority}`);
</script>

<label class="flex w-full cursor-pointer items-center gap-3 py-2" for={inputId}>
	<input
		id={inputId}
		name={groupName}
		checked={selected}
		data-tid={testId}
		onchange={() => onSelect(priority)}
		type="radio"
		value={priority}
	/>

	<span class="flex flex-col">
		<span class="font-bold text-primary">{name} {emoji}</span>
		<span class="text-sm text-tertiary">{description}</span>
	</span>

	<span class="ml-auto text-right">
		{#if nonNullish(fee)}
			<FeeDisplay {decimals} {exchangeRate} feeAmount={fee} {symbol} />
		{/if}
	</span>
</label>
