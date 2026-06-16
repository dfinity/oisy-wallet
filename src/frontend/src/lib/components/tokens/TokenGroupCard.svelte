<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import IconExpand from '$lib/components/icons/IconExpand.svelte';
	import TokenCard from '$lib/components/tokens/TokenCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { TOKEN_GROUP } from '$lib/constants/test-ids.constants';
	import { SLIDE_PARAMS } from '$lib/constants/transition.constants';
	import { showTokenCategoryFilter, tokenCategoryFilter } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { tokenGroupStore } from '$lib/stores/token-group.store';
	import { tokenListStore } from '$lib/stores/token-list.store';
	import type { CardData } from '$lib/types/token-card';
	import type { TokenUi } from '$lib/types/token-ui';
	import type { TokenUiGroup } from '$lib/types/token-ui-group';
	import { replacePlaceholders } from '$lib/utils/i18n.utils.js';
	import { transactionsUrl } from '$lib/utils/nav.utils';
	import { mapHeaderData } from '$lib/utils/token-card.utils';
	import { getFilteredTokenGroup } from '$lib/utils/token-list.utils.js';
	import { filterTokensUiByCategory } from '$lib/utils/token-tag.utils';
	import { sumTokensUiUsdBalance } from '$lib/utils/tokens.utils';

	interface Props {
		tokenGroup: TokenUiGroup;
	}

	let { tokenGroup }: Props = $props();

	const isExpanded: boolean = $derived(
		($tokenGroupStore ?? {})[tokenGroup.id]?.isExpanded ?? false
	);

	const hideZeros: boolean = $derived(($tokenGroupStore ?? {})[tokenGroup.id]?.hideZeros ?? true);

	const toggleIsExpanded = (toggle: boolean) =>
		tokenGroupStore.set({ id: tokenGroup.id, data: { isExpanded: toggle, hideZeros } });

	const toggleHideZeros = (toggle: boolean) =>
		tokenGroupStore.set({ id: tokenGroup.id, data: { isExpanded, hideZeros: toggle } });

	const headerData: CardData = $derived(mapHeaderData(tokenGroup));

	const showTokenInGroup = (token: TokenUi) => token.neverCollapseInTokenGroup;
	const isCkToken = (token: TokenUi) => nonNullish(token.oisyName?.prefix); // logic taken from old ck badge
	const collator = new Intl.Collator(undefined, { sensitivity: 'base' });

	const categoryFilteredTokens: TokenUi[] = $derived(
		$showTokenCategoryFilter
			? filterTokensUiByCategory({
					tokens: tokenGroup.tokens,
					category: $tokenCategoryFilter
				})
			: tokenGroup.tokens
	);

	const filteredTokens: TokenUi[] = $derived(
		getFilteredTokenGroup({
			filter: $tokenListStore.filter,
			list: categoryFilteredTokens
		})
	);

	const totalUsdBalance: number = $derived(sumTokensUiUsdBalance(filteredTokens));

	// eslint-disable-next-line local-rules/prefer-object-params -- This is a sort function.
	const compareTokens = (a: TokenUi, b: TokenUi): number => {
		// Highest balance first
		const usdBalanceDiff = (b.usdBalance ?? 0) - (a.usdBalance ?? 0);
		if (usdBalanceDiff !== 0) {
			return usdBalanceDiff;
		}

		// If same balance, order by showTokenInGroup (neverCollapseInTokenGroup) > CK > others
		if (showTokenInGroup(a) !== showTokenInGroup(b)) {
			return showTokenInGroup(a) ? -1 : 1;
		}
		if (isCkToken(a) !== isCkToken(b)) {
			return isCkToken(a) ? -1 : 1;
		}

		return collator.compare(a.network.name, b.network.name);
	};

	const sortedFilteredTokens: TokenUi[] = $derived([...filteredTokens].sort(compareTokens));

	// list of tokens that should display with a "show more" button for not displayed ones
	const truncatedTokens: TokenUi[] = $derived(
		sortedFilteredTokens.filter(
			(token) =>
				// Only include tokens with a balance
				(token.usdBalance ?? 0) > 0 ||
				// If the total balance is 0, show all
				totalUsdBalance === 0
		)
	);

	// Show all if hideZeros = false
	const tokensToShow: TokenUi[] = $derived(hideZeros ? truncatedTokens : sortedFilteredTokens);

	// Count tokens that are not displayed
	const notDisplayedCount: number = $derived(sortedFilteredTokens.length - tokensToShow.length);
</script>

<div class="flex flex-col" class:bg-primary={isExpanded}>
	<div class="hover:bg-primary transition-colors duration-300">
		<TokenCard
			data={{
				...headerData,
				tokenCount: filteredTokens.length,
				networks: sortedFilteredTokens.map((t) => t.network)
			}}
			onClick={() => toggleIsExpanded(!isExpanded)}
			testIdPrefix={TOKEN_GROUP}
		/>
	</div>

	{#if isExpanded}
		<div class="ml-0 flex flex-col gap-1.5 p-2 md:ml-16" transition:slide={SLIDE_PARAMS}>
			{#each tokensToShow as token (`token:${token.id.description}:${token.network.id.description}`)}
				<div
					class="bg-secondary hover:bg-brand-subtle-10 flex overflow-hidden rounded-lg transition-colors duration-250"
					transition:slide={SLIDE_PARAMS}
				>
					<TokenCard asNetwork data={token} onClick={() => goto(transactionsUrl({ token }))} />
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
