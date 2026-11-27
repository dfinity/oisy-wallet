<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
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
	import { findSwapProvider, isUnprotectedOffer } from '$lib/utils/swap.utils';
	import { slide } from '$lib/utils/transitions.utils';

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	let selectedProvider = $derived($swapAmountsStore?.selectedProvider);

	// The warning is the only thing on Review that says there is no minimum, so a provider without
	// metadata is named by its id rather than left unwarned.
	let providerName = $derived.by(() => {
		if (isNullish(selectedProvider) || !isUnprotectedOffer(selectedProvider)) {
			return;
		}

		const swapDApp = findSwapProvider(selectedProvider.provider);

		return nonNullish(swapDApp)
			? resolveText({ i18n: $i18n, path: swapDApp.name })
			: selectedProvider.provider;
	});
</script>

{#if nonNullish(providerName)}
	<div class="mt-4" transition:slide={SLIDE_DURATION}>
		<MessageBox level="warning" styleClass="!mb-0" testId={SWAP_UNPROTECTED_OFFER_WARNING}>
			{replacePlaceholders($i18n.swap.text.unprotected_offer_warning, {
				$provider: providerName
			})}
		</MessageBox>
	</div>
{/if}
