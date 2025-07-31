<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import IconExpand from '$lib/components/icons/IconExpand.svelte';
	import TokenCard from '$lib/components/tokens/TokenCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { TOKEN_GROUP } from '$lib/constants/test-ids.constants';
	import { SLIDE_PARAMS } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { tokenGroupStore } from '$lib/stores/token-group.store';
	import { tokenListStore } from '$lib/stores/token-list.store';
	import type { TokenUi } from '$lib/types/token';
	import type { CardData } from '$lib/types/token-card';
	import type { TokenUiGroup } from '$lib/types/token-group';
	import { replacePlaceholders } from '$lib/utils/i18n.utils.js';
	import { transactionsUrl } from '$lib/utils/nav.utils';
	import { mapHeaderData } from '$lib/utils/token-card.utils';
	import { getFilteredTokenGroup } from '$lib/utils/token-list.utils.js';

	let { tokenGroup }: { tokenGroup: TokenUiGroup } = $props();

	const isExpanded: boolean = $derived(
		($tokenGroupStore ?? {})[tokenGroup.id]?.isExpanded ?? false
	);

	const hideZeros: boolean = $derived(($tokenGroupStore ?? {})[tokenGroup.id]?.hideZeros ?? true);

	const toggleIsExpanded = (toggle: boolean) =>
		tokenGroupStore.set({ id: tokenGroup.id, data: { isExpanded: toggle, hideZeros } });

	const toggleHideZeros = (toggle: boolean) =>
		tokenGroupStore.set({ id: tokenGroup.id, data: { isExpanded, hideZeros: toggle } });

	const headerData: CardData = $derived(mapHeaderData(tokenGroup));

	const showTokenInGroup = (token: TokenUi) => token.alwaysShowInTokenGroup;
	const isCkToken = (token: TokenUi) => nonNullish(token.oisyName?.prefix); // logic taken from old ck badge

	// list of filtered tokens, filtered by string input
	const filteredTokens: TokenUi[] = $derived(
		getFilteredTokenGroup({
			filter: $tokenListStore.filter,
			list: tokenGroup.tokens
		})
	);

	// list of tokens that should display with a "show more" button for not displayed ones
	const truncatedTokens: TokenUi[] = $derived(
		filteredTokens.filter((token) => {
			const totalBalance = filteredTokens.reduce((p, c) => p + (c.usdBalance ?? 0), 0);
			// Only include tokens with a balance
			return (
				(token.usdBalance ?? 0) > 0 ||
				// If the total balance is 0, show all
				totalBalance === 0
			);
		})
	);

	// Show all if hideZeros = false and sort
	const tokensToShow: TokenUi[] = $derived(
		(hideZeros ? truncatedTokens : filteredTokens).sort((a, b) => {
			const balanceA = a.usdBalance ?? 0;
			const balanceB = b.usdBalance ?? 0;
			// higher balances show first
			if (balanceA > balanceB) {
				return -1;
			}
			if (balanceA < balanceB) {
				return 1;
			}
			// if same balance order by Native > CK > others
			return showTokenInGroup(a) ? -1 : isCkToken(a) && !showTokenInGroup(b) ? -1 : 1;
		})
	);

	// Count tokens that are not displayed
	const notDisplayedCount: number = $derived(filteredTokens.length - tokensToShow.length);
</script>

<div class="flex flex-col" class:bg-primary={isExpanded}>
	<div class="transition duration-300 hover:bg-primary">
		<TokenCard
			data={{
				...headerData,
				tokenCount: filteredTokens.length,
				networks: filteredTokens.map((t) => t.network)
			}}
			testIdPrefix={TOKEN_GROUP}
			on:click={() => toggleIsExpanded(!isExpanded)}
		/>
	</div>

	{#if isExpanded}
		<div class="ml-0 flex flex-col gap-1.5 p-2 md:ml-16" transition:slide={SLIDE_PARAMS}>
			{#each tokensToShow as token (token.id)}
				<div
					class="duration-250 flex overflow-hidden rounded-lg bg-secondary transition hover:bg-brand-subtle-10"
					transition:slide={SLIDE_PARAMS}
				>
					<TokenCard asNetwork data={token} on:click={() => goto(transactionsUrl({ token }))} />
				</div>
			{/each}

			{#if notDisplayedCount > 0 || !hideZeros}
				<Button
					link
					onclick={() => toggleHideZeros(!hideZeros)}
					styleClass="font-normal text-sm justify-start py-2"
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
