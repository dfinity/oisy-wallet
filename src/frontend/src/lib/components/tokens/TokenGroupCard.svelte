<script lang="ts">
	import { slide } from 'svelte/transition';
	import MultipleListeners from '$lib/components/core/MultipleListeners.svelte';
	import { TOKEN_GROUP } from '$lib/constants/test-ids.constants';
	import { SLIDE_PARAMS } from '$lib/constants/transition.constants';
	import { tokenGroupStore } from '$lib/stores/token-group.store';
	import type { CardData } from '$lib/types/token-card';
	import type { TokenUiGroup } from '$lib/types/token-group';
	import { mapHeaderData } from '$lib/utils/token-card.utils';
	import TokenCard from '$lib/components/tokens/TokenCard.svelte';
	import { transactionsUrl } from '$lib/utils/nav.utils';
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { TokenUi } from '$lib/types/token';

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

	$: filteredTokens = tokenGroup.tokens.filter(
		(token) => isCkToken(token) || isDefaultToken(token) || (token.balance || 0n) > 0 // Always display if balance > 0
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
				data={headerData}
				hideNetworkLogo
				testIdPrefix={TOKEN_GROUP}
				on:click={() => toggleIsExpanded(!isExpanded)}
				{isExpanded}
				description={[...new Set(tokenGroup.tokens.map((t) => t.network.name))].join(
					'&nbsp;&middot;&nbsp;'
				)}
			/>
		</div>
	</MultipleListeners>

	{#if isExpanded}
		<div class="ml-0 flex flex-col gap-1.5 p-2 md:ml-16" transition:slide={SLIDE_PARAMS}>
			{#each tokensToShow as token (token.id)}
				<div
					class="flex overflow-hidden rounded-lg bg-secondary transition duration-300 hover:bg-brand-subtle-10"
				>
					<TokenCard
						data={token}
						hideNetworkLogo
						cardSize="xs"
						on:click={() => goto(transactionsUrl({ token }))}
					/>
				</div>
			{/each}

			{#if notDisplayedCount > 0 || !hideZeros}
				<Button
					styleClass="font-normal text-sm justify-start py-2"
					link
					on:click={() => toggleHideZeros(!hideZeros)}
					>{hideZeros ? `Show ${notDisplayedCount} more networks` : `Hide more networks`}</Button
				>
			{/if}
		</div>
	{/if}
</div>
