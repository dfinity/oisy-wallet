<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import {
		SWAP_TWO_SWAPS_HINT,
		SWAP_TWO_SWAPS_HINT_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { trackSwapTwoSwapsHint } from '$lib/services/swap-two-swaps-hint-analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { SwapProvider } from '$lib/types/swap';
	import type { Token } from '$lib/types/token';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		intermediateToken: Token;
		provider: SwapProvider;
	}

	let { intermediateToken, provider }: Props = $props();

	const { sourceToken, destinationToken, setDestinationToken, markTwoSwapsHintShown } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	// Counted once per pair, in-between token and quoted amount while the swap modal is open: the
	// hint comes and goes with the quotes, and the form is rebuilt with every step change.
	onMount(() => {
		if (isNullish($sourceToken) || isNullish($destinationToken)) {
			return;
		}

		const firstShown = markTwoSwapsHintShown({
			sourceTokenId: $sourceToken.id,
			destinationTokenId: $destinationToken.id,
			intermediateTokenId: intermediateToken.id,
			amount: $swapAmountsStore?.amountForSwap
		});

		if (!firstShown) {
			return;
		}

		trackSwapTwoSwapsHint({
			action: 'show',
			provider,
			sourceToken: $sourceToken,
			destinationToken: $destinationToken,
			intermediateToken
		});
	});

	// The first of the two swaps: from the same source, for the same amount, to the in-between token.
	const onSwapFirst = () => {
		// Read before the reset: the props come from the quote error the reset clears, so reading
		// them afterwards finds it gone.
		const token = intermediateToken;

		if (nonNullish($sourceToken) && nonNullish($destinationToken)) {
			trackSwapTwoSwapsHint({
				action: 'click',
				provider,
				sourceToken: $sourceToken,
				destinationToken: $destinationToken,
				intermediateToken: token
			});
		}

		swapAmountsStore.reset();

		setDestinationToken(token);
	};
</script>

{#if nonNullish($sourceToken) && nonNullish($destinationToken)}
	<div class="mt-6">
		<MessageBox styleClass="sm:text-sm" testId={SWAP_TWO_SWAPS_HINT}>
			<p>
				{replacePlaceholders(replaceOisyPlaceholders($i18n.swap.text.two_swaps_info), {
					$sourceSymbol: $sourceToken.symbol,
					$destinationSymbol: $destinationToken.symbol,
					$intermediateSymbol: intermediateToken.symbol
				})}
			</p>

			<Button
				link
				onclick={onSwapFirst}
				paddingSmall
				styleClass="mt-2"
				testId={SWAP_TWO_SWAPS_HINT_BUTTON}
				type="button"
			>
				{replacePlaceholders($i18n.swap.text.two_swaps_first_button, {
					$intermediateSymbol: intermediateToken.symbol
				})}
			</Button>
		</MessageBox>
	</div>
{/if}
