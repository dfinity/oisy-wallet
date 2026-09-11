<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ConvertAmountExchange from '$lib/components/convert/ConvertAmountExchange.svelte';
	import type { EthFeePriority } from '$lib/enums/eth-fee-priority';
	import { formatToken } from '$lib/utils/format.utils';

	interface Props {
		priority: EthFeePriority;
		name: string;
		description: string;
		emoji: string;
		selected: boolean;
		fee?: bigint;
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

	<span class="flex min-w-0 items-baseline gap-2">
		<span class="font-bold whitespace-nowrap text-primary">{name} {emoji}</span>
		<span class="min-w-0 truncate text-sm text-tertiary">{description}</span>
	</span>

	<span class="ml-auto shrink-0 pl-2 text-right text-sm text-tertiary">
		{#if nonNullish(fee)}
			<ConvertAmountExchange
				amount={formatToken({ value: fee, displayDecimals: decimals, unitName: decimals })}
				{exchangeRate}
			/>
		{/if}
	</span>
</label>
