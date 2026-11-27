<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { SWAP_UNPROTECTED_OFFER_WARNING } from '$lib/constants/test-ids.constants';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { replacePlaceholders, resolveText } from '$lib/utils/i18n.utils';
	import { findSwapProvider, isProtectedOffer } from '$lib/utils/swap.utils';
	import { slide } from '$lib/utils/transitions.utils';

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	let selectedProvider = $derived($swapAmountsStore?.selectedProvider);

	let swapDApp = $derived(
		nonNullish(selectedProvider) && !isProtectedOffer(selectedProvider)
			? findSwapProvider(selectedProvider.provider)
			: undefined
	);
</script>

{#if nonNullish(swapDApp)}
	<div class="mt-4" transition:slide={SLIDE_DURATION}>
		<MessageBox level="warning" styleClass="!mb-0" testId={SWAP_UNPROTECTED_OFFER_WARNING}>
			{replacePlaceholders($i18n.swap.text.unprotected_offer_warning, {
				$provider: resolveText({ i18n: $i18n, path: swapDApp.name })
			})}
		</MessageBox>
	</div>
{/if}
