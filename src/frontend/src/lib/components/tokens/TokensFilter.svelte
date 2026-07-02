<script lang="ts">
	import type { Snippet } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import IconSearch from '$lib/components/icons/IconSearch.svelte';
	import SlidingInput from '$lib/components/ui/SlidingInput.svelte';
	import { TOKEN_LIST_FILTER } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { tokenListStore } from '$lib/stores/token-list.store';
	import {
		isEarningPath,
		isNftsPath,
		isTokensPath,
		isTransactionsPath
	} from '$lib/utils/nav.utils';

	interface Props {
		overflowableContent?: Snippet;
		hideFilter?: boolean;
	}

	let { overflowableContent, hideFilter = false }: Props = $props();

	let inputValue = $derived($tokenListStore.filter);

	// Persist the filter when switching between asset tabs (Tokens, NFTs, Earning) or returning from transactions.
	// Reset it when navigating from any other page (e.g. Settings, Activity).
	afterNavigate(({ from }) => {
		const previousRoute = from?.route?.id ?? null;

		if (
			!isTokensPath(previousRoute) &&
			!isNftsPath(previousRoute) &&
			!isEarningPath(previousRoute) &&
			!isTransactionsPath(previousRoute)
		) {
			tokenListStore.set({ filter: '' });
		}
	});

	// update store on inputValue change
	$effect(() => {
		tokenListStore.set({ filter: inputValue });
	});
</script>

{#if hideFilter}
	{@render overflowableContent?.()}
{:else}
	<SlidingInput
		ariaLabel={$i18n.tokens.alt.filter_button}
		inputPlaceholder={$i18n.tokens.text.filter_placeholder}
		{overflowableContent}
		testIdPrefix={TOKEN_LIST_FILTER}
		bind:inputValue
	>
		{#snippet icon()}
			<IconSearch />
		{/snippet}
	</SlidingInput>
{/if}
