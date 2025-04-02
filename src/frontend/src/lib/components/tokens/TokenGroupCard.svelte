<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import MultipleListeners from '$lib/components/core/MultipleListeners.svelte';
	import IconExpand from '$lib/components/icons/IconExpand.svelte';
	import TokenCard from '$lib/components/tokens/TokenCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { TOKEN_GROUP } from '$lib/constants/test-ids.constants';
	import { SLIDE_PARAMS } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { tokenGroupStore } from '$lib/stores/token-group.store';
	import type { TokenUi } from '$lib/types/token';
	import type { CardData } from '$lib/types/token-card';
	import type { TokenUiGroup } from '$lib/types/token-group';
	import { replacePlaceholders } from '$lib/utils/i18n.utils.js';
	import { transactionsUrl } from '$lib/utils/nav.utils';
	import { mapHeaderData } from '$lib/utils/token-card.utils';

	export let tokenGroup: TokenUiGroup;

	let isExpanded: boolean;
	$: isExpanded = ($tokenGroupStore ?? {})[tokenGroup.id]?.isExpanded ?? false;

	let hideZeros: boolean;
	$: hideZeros = ($tokenGroupStore ?? {})[tokenGroup.id]?.hideZeros ?? true;

	const toggleIsExpanded = (toggle: boolean) =>
		tokenGroupStore.set({ tokenId: tokenGroup.id, data: { isExpanded: toggle, hideZeros } });

	const toggleHideZeros = (toggle: boolean) =>
		tokenGroupStore.set({ tokenId: tokenGroup.id, data: { isExpanded, hideZeros: toggle } });

	let headerData: CardData;
	$: headerData = mapHeaderData(tokenGroup);

	const isDefaultToken = (token: TokenUi) => tokenGroup.nativeToken.id === token.id;
	const isCkToken = (token: TokenUi) => nonNullish(token.oisyName?.prefix);

	let filteredTokens: TokenUi[];
	$: filteredTokens = tokenGroup.tokens.filter(
		(token) => isCkToken(token) || isDefaultToken(token) || (token.balance ?? 0n) > 0 // Always display if balance > 0
	);

	// Show all if hideZeros = false
	$: tokensToShow = (hideZeros ? filteredTokens : tokenGroup.tokens).sort((a, b) =>
		isDefaultToken(a) ? -1 : isCkToken(a) && !isDefaultToken(b) ? -1 : 1
	);

	// Count tokens that are not displayed
	$: notDisplayedCount = tokenGroup.tokens.length - tokensToShow.length;
</script>

<div class="flex flex-col" class:bg-primary={isExpanded}>
	<MultipleListeners tokens={tokenGroup.tokens}>
		<div class="transition duration-300 hover:bg-primary">
			<TokenCard
				data={{ ...headerData, networks: tokenGroup.tokens.map((t) => t.network) }}
				testIdPrefix={TOKEN_GROUP}
				on:click={() => toggleIsExpanded(!isExpanded)}
			/>
		</div>
	</MultipleListeners>

	{#if isExpanded}
		<div class="ml-0 flex flex-col gap-1.5 p-2 md:ml-16" transition:slide={SLIDE_PARAMS}>
			{#each tokensToShow as token (token.id)}
				<div
					class="flex overflow-hidden rounded-lg bg-secondary transition duration-300 hover:bg-brand-subtle-10"
					transition:slide={SLIDE_PARAMS}
				>
					<TokenCard data={token} condensed on:click={() => goto(transactionsUrl({ token }))} />
				</div>
			{/each}

			{#if notDisplayedCount > 0 || !hideZeros}
				<Button
					styleClass="font-normal text-sm justify-start py-2"
					link
					on:click={() => toggleHideZeros(!hideZeros)}
				>
					{hideZeros
						? replacePlaceholders($i18n.tokens.text.show_more_networks, {
								$number: `${notDisplayedCount}`
							})
						: $i18n.tokens.text.hide_more_networks}
					<IconExpand expanded={!hideZeros} />
				</Button>
			{/if}
		</div>
	{/if}
</div>
