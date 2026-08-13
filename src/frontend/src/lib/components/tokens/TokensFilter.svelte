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
		isTokensPath,
		isTradingPath,
		isTransactionsPath
	} from '$lib/utils/nav.utils';

	interface Props {
		overflowableContent?: Snippet;
	}

	let { overflowableContent }: Props = $props();

	let inputValue = $derived($tokenListStore.filter);

	// Persist the filter when switching between asset tabs (Tokens, Earning, Trading) or returning from transactions.
	// Reset it when navigating from any other page (e.g. Settings, Activity, NFTs — a standalone destination now).
	afterNavigate(({ from }) => {
		const previousRoute = from?.route?.id ?? null;

		if (
			!isTokensPath(previousRoute) &&
			!isEarningPath(previousRoute) &&
			!isTradingPath(previousRoute) &&
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
