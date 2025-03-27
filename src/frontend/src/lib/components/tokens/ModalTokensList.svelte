<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import ModalTokensListItem from '$lib/components/tokens/ModalTokensListItem.svelte';
	import TokensSkeletons from '$lib/components/tokens/TokensSkeletons.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import InputSearch from '$lib/components/ui/InputSearch.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { TokenUi } from '$lib/types/token';
	import { isDesktop } from '$lib/utils/device.utils';
	import { filterTokens } from '$lib/utils/tokens.utils';

	export let tokens: TokenUi[];
	export let loading: boolean;

	const dispatch = createEventDispatcher();

	let filter = '';

	let filteredTokens: TokenUi[] = [];
	$: filteredTokens = filterTokens({ tokens, filter });

	let noTokensMatch = false;
	$: noTokensMatch = filteredTokens.length === 0;
</script>

<!-- TODO: Add network selector component here -->
<InputSearch
	bind:filter
	noMatch={noTokensMatch}
	placeholder={$i18n.tokens.placeholder.search_token}
	autofocus={isDesktop()}
/>

<div class="my-6 flex flex-col overflow-y-hidden sm:max-h-[26rem]">
	<div class="gap-6 overflow-y-auto overscroll-contain">
		<TokensSkeletons {loading}>
			{#if noTokensMatch}
				<p class="text-primary">
					{$i18n.tokens.manage.text.all_tokens_zero_balance}
				</p>
			{:else}
				{#each filteredTokens as token (token.id)}
					<ModalTokensListItem
						on:click={() => dispatch('icTokenButtonClick', token)}
						data={token}
					/>
				{/each}
			{/if}
		</TokensSkeletons>
	</div>
</div>

<ButtonGroup>
	<slot name="toolbar" />
</ButtonGroup>
