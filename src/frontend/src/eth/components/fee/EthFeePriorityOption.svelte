<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { formatGasFeeInGwei } from '$eth/utils/fee.utils';
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

	// The same helper the fee row below uses, so an option and the fee it produces cannot end up
	// formatted differently.
	const gweiFee = $derived(
		nonNullish(fee) ? formatGasFeeInGwei({ value: fee, language: $currentLanguage }) : undefined
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

	<span class="ml-auto shrink-0 pl-2">
		{#if nonNullish(fee)}
			<!-- Mirrors the value side of `ModalValue`, which is what the fee row below these options
			     renders, so an option and the fee it produces are laid out identically. -->
			<span
				class="flex flex-col items-end gap-1 text-sm text-tertiary sm:flex-row sm:items-center sm:gap-2"
			>
				<span class="font-bold text-primary" data-tid={ETH_FEE_PRIORITY_OPTION_AMOUNT}>
					{gweiFee}
					{$i18n.fee.text.gwei}
				</span>

				<ConvertAmountExchange
					amount={formatToken({ value: fee, displayDecimals: decimals, unitName: decimals })}
					{exchangeRate}
				/>
			</span>
		{/if}
	</span>
</label>
