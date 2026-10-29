<script lang="ts">
	import { getContext, type Snippet } from 'svelte';
	import { readable } from 'svelte/store';
	import ConvertAmountDisplay from '$lib/components/convert/ConvertAmountDisplay.svelte';
	import Html from '$lib/components/ui/Html.svelte';
	import { SWAP_DETAILS_ROW_STAGGER_MS } from '$lib/constants/swap.constants';
	import { SWAP_FEE_ROW } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { fade, fly, slide } from '$lib/utils/transitions.utils';

	interface Props {
		// Whether the form has fees to show while no comparison runs.
		show?: boolean;
		// Off for forms whose fee row has no fiat line, so the skeleton keeps the row's height.
		displayExchangeRate?: boolean;
		children: Snippet;
	}

	let { show = true, displayExchangeRate = true, children }: Props = $props();

	const { activity } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);
	const quoteActivity = activity ?? readable(undefined);

	// Until a foreground comparison picks its provider, the fees are not known: the last quote's
	// would describe a provider that may not win. A background refresh keeps them in place.
	let comparing = $derived($quoteActivity?.pending === true && !$quoteActivity.background);
</script>

{#if comparing || show}
	<div transition:slide>
		<!-- One cell for both, so the skeleton and the fees cross-fade in place. -->
		<div
			class="grid"
			data-tid={SWAP_FEE_ROW}
			transition:fly={{ y: 4, delay: SWAP_DETAILS_ROW_STAGGER_MS }}
		>
			{#if comparing}
				<div class="[grid-area:1/1]" transition:fade>
					<!-- No amount yet, so no symbol: only the skeleton renders. -->
					<ConvertAmountDisplay {displayExchangeRate} symbol="">
						{#snippet label()}<Html text={$i18n.fee.text.total_fee} />{/snippet}
					</ConvertAmountDisplay>
				</div>
			{:else}
				<div class="[grid-area:1/1]" transition:fade>
					{@render children()}
				</div>
			{/if}
		</div>
	</div>
{/if}
