<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ConvertAmountExchange from '$lib/components/convert/ConvertAmountExchange.svelte';
	import { ETH_FEE_PRIORITY_OPTION_AMOUNT } from '$lib/constants/test-ids.constants';
	import { currentLanguage } from '$lib/derived/i18n.derived';
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

	// Quoted in gwei rather than in the native token: a fee is a handful of millionths of an ETH,
	// so in ETH the three tiers separate only in the eighth decimal and read as the same number.
	// The fiat below is the same amount, so the row states one quantity in two units. Grouped,
	// because a gwei total runs to six or seven digits and is unreadable without separators.
	const gweiFee = $derived(
		nonNullish(fee)
			? new Intl.NumberFormat($currentLanguage).format(
					Number(formatToken({ value: fee, unitName: 'gwei', displayDecimals: 0 }))
				)
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
			<div class="font-bold text-primary" data-tid={ETH_FEE_PRIORITY_OPTION_AMOUNT}>
				{gweiFee}
				{$i18n.fee.text.gwei}
			</div>

			<ConvertAmountExchange
				amount={formatToken({ value: fee, displayDecimals: decimals, unitName: decimals })}
				{exchangeRate}
			/>
		{/if}
	</span>
</label>
