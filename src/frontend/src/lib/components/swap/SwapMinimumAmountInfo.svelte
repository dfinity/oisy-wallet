<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { SWAP_MINIMUM_AMOUNT_INFO } from '$lib/constants/test-ids.constants';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { nearIntentsSwapLimitStore } from '$lib/stores/near-intents-swap-limit.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { formatCurrency } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	// The provider's fiat floor for the selected pair, as guidance before an amount is
	// entered. Only the fiat chain limit is announced: the per-route bridge minimum is an
	// inherent withdrawal-cost floor that almost never binds, and naming it on every pair
	// would be noise. Once an amount is entered, the form's refusal names whichever applies.
	//
	// Full width beside the other pair-level notices rather than in the pay field's info row:
	// that row is a justify-between against the balance and Max button, and a longer currency
	// string (CHF 1'000.00) wraps into the balance on a narrow screen.
	let formattedLimit = $derived(
		nonNullish($nearIntentsSwapLimitStore)
			? formatCurrency({
					value: $nearIntentsSwapLimitStore,
					currency: $currentCurrency,
					exchangeRate: $currencyExchangeStore,
					language: $currentLanguage
				})
			: undefined
	);

	// An offer answers the question the notice exists to pre-empt, so it steps out of the way
	// rather than repeating a floor the user has already cleared.
	let quoted = $derived(($swapAmountsStore?.swaps.length ?? 0) > 0);
</script>

{#if nonNullish(formattedLimit) && !quoted}
	<div class="mt-6">
		<MessageBox styleClass="sm:text-sm" testId={SWAP_MINIMUM_AMOUNT_INFO}>
			{replacePlaceholders($i18n.swap.text.swap_minimum_amount_hint, { $amount: formattedLimit })}
		</MessageBox>
	</div>
{/if}
