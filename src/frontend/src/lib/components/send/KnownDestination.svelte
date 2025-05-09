<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { normalizeTimestampToSeconds } from '$icp/utils/date.utils';
	import IconConvertTo from '$lib/components/icons/IconConvertTo.svelte';
	import Amount from '$lib/components/ui/Amount.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import RoundedIcon from '$lib/components/ui/RoundedIcon.svelte';
	import { MAX_DISPLAYED_KNOWN_DESTINATION_AMOUNTS } from '$lib/constants/app.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Address } from '$lib/types/address';
	import type { Token } from '$lib/types/token';
	import {
		formatSecondsToNormalizedDate,
		shortenWithMiddleEllipsis
	} from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		token: Token;
		destination: Address;
		amounts: bigint[];
		timestamp?: number;
	}
	let { token, destination, amounts, timestamp }: Props = $props();

	// we only display the first 3 amounts, and the rest is displayed as "+N more"
	let amountsToDisplay = $derived(amounts.slice(0, MAX_DISPLAYED_KNOWN_DESTINATION_AMOUNTS));

	let restAmountsNumber = $derived(amounts.length - amountsToDisplay.length);

	let currentDate = $state(new Date());
</script>

<LogoButton styleClass="group" on:click>
	<div class="mr-2" slot="logo"><RoundedIcon icon={IconConvertTo} /></div>

	<svelte:fragment slot="title">
		<span class="text-base">{shortenWithMiddleEllipsis({ text: destination })}</span>
	</svelte:fragment>

	<svelte:fragment slot="description">
		{#each amountsToDisplay as amount, index (index)}
			<Amount {amount} decimals={token.decimals} symbol={token.symbol} />
			{#if index < amounts.length - 1}
				&nbsp;&middot;&nbsp;
			{/if}
		{/each}

		{#if restAmountsNumber > 0}
			{replacePlaceholders($i18n.core.text.more_items, { $items: `${restAmountsNumber}` })}
		{/if}
	</svelte:fragment>

	<svelte:fragment slot="description-end">
		<div class="block group-hover:hidden">
			{#if nonNullish(timestamp)}
				{formatSecondsToNormalizedDate({
					seconds: normalizeTimestampToSeconds(timestamp),
					currentDate
				})}
			{/if}
		</div>

		<div class="hidden text-brand-primary group-hover:block">{$i18n.send.text.send_again}</div>
	</svelte:fragment>
</LogoButton>
