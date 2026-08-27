<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import WalletConnectModalValue from '$lib/components/wallet-connect/WalletConnectModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { SolInstructionViewRow } from '$sol/types/sol-instructions-view';

	interface Props {
		rows: SolInstructionViewRow[];
		// How many instructions the message carries in total, which is what makes the filtering
		// legible: three lines out of thirty-seven is only trustworthy if the list says so.
		total: number;
		shown: number;
	}

	let { rows, total, shown }: Props = $props();
</script>

{#snippet line({ text, detail, children }: SolInstructionViewRow)}
	<span class="flex flex-col gap-1" data-tid="contained-instruction">
		<span>
			{text}{#if nonNullish(detail)}<span class="text-tertiary">{` · ${detail}`}</span>{/if}
		</span>

		<!-- The legs sit under the route that produced them. Without the indent a four-leg swap reads
		     as four unrelated transfers, which is the one thing the grouping exists to prevent. -->
		{#if nonNullish(children)}
			<span class="flex flex-col gap-1 ps-4">
				{#each children as child, i (i)}
					{@render line(child)}
				{/each}
			</span>
		{/if}
	</span>
{/snippet}

<WalletConnectModalValue
	label={$i18n.wallet_connect.text.simulated_instructions}
	ref="contained-instructions"
>
	<div class="flex flex-col gap-1">
		{#each rows as row, i (i)}
			{@render line(row)}
		{:else}
			<span class="text-tertiary">{$i18n.wallet_connect.text.instructions_none}</span>
		{/each}

		<span class="text-tertiary">{shown} of {total} instructions concern your accounts.</span>
	</div>
</WalletConnectModalValue>
