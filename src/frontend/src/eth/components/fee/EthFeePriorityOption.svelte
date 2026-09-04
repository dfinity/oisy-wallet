<script lang="ts">
	import { nonNullish, secondsToDuration } from '@dfinity/utils';
	import ConvertAmountExchange from '$lib/components/convert/ConvertAmountExchange.svelte';
	import type { EthFeePriority } from '$lib/enums/eth-fee-priority';
	import { i18n } from '$lib/stores/i18n.store';
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
		waitTimeMs?: number;
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
		waitTimeMs,
		groupName,
		testId,
		onSelect
	}: Props = $props();

	const inputId = $derived(`${groupName}-${priority}`);

	// Sub-second estimates round up rather than to zero: a chain that confirms in 500ms is better
	// described as a second than as nothing.
	const formattedWaitTime = $derived(
		nonNullish(waitTimeMs)
			? secondsToDuration({
					seconds: BigInt(Math.max(1, Math.round(waitTimeMs / 1000))),
					i18n: $i18n.temporal.seconds_to_duration
				})
			: undefined
	);
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

		{#if nonNullish(waitTimeMs)}
			<div>~{formattedWaitTime}</div>
		{/if}
	</span>
</label>
