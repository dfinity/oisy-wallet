<script lang="ts">
	import type { Snippet } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import IconSearch from '$lib/components/icons/IconSearch.svelte';
	import SlidingInput from '$lib/components/ui/SlidingInput.svelte';
	import { TOKEN_LIST_FILTER } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { tokenListStore } from '$lib/stores/token-list.store';
	import { isTokensPath, isTransactionsPath } from '$lib/utils/nav.utils';

	let { overflowableContent }: { overflowableContent?: Snippet } = $props();

	let inputValue = $derived($tokenListStore.filter);

	// reset search if not coming from home (switching networks) or transactions page
	afterNavigate(({ from }) => {
		const previousRoute = `${from?.route?.id}/`;
		if (!isTokensPath(previousRoute) && !isTransactionsPath(previousRoute)) {
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
	disabled={$erc20UserTokensNotInitialized}
	inputPlaceholder={$i18n.tokens.text.filter_placeholder}
	{overflowableContent}
	testIdPrefix={TOKEN_LIST_FILTER}
	bind:inputValue
>
	{#snippet icon()}
		<IconSearch />
	{/snippet}
</SlidingInput>
