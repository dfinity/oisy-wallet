<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import MultipleListeners from '$lib/components/core/MultipleListeners.svelte';
	import IconExpand from '$lib/components/icons/IconExpand.svelte';
	import TokenCard from '$lib/components/tokens/TokenCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { ZERO_BI } from '$lib/constants/app.constants';
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
		tokenGroupStore.set({ tokenId: tokenGroup.id, data: { isExpanded: toggle, hideZeros } });

	const toggleHideZeros = (toggle: boolean) =>
		tokenGroupStore.set({ tokenId: tokenGroup.id, data: { isExpanded, hideZeros: toggle } });

	const headerData: CardData = $derived(mapHeaderData(tokenGroup));

	const isNativeToken = (token: TokenUi) => tokenGroup.nativeToken.id === token.id;
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
			const totalBalance = filteredTokens.reduce((p, c) => p + BigInt(c.balance ?? 0n), ZERO_BI);
			// Only include tokens with a balance
			return (
				(token.balance ?? 0n) > 0n ||
				// If the total balance is 0, only include CK or Native tokens
				(totalBalance === 0n && (isCkToken(token) || isNativeToken(token)))
			);
		})
	);

	// Show all if hideZeros = false and sort
	const tokensToShow: TokenUi[] = $derived(
		(hideZeros ? filteredTokens : truncatedTokens).sort((a, b) => {
			const balanceA = BigInt(a.balance ?? 0n);
			const balanceB = BigInt(b.balance ?? 0n);
			// higher balances show first
			if (balanceA > balanceB) {
				return -1;
			}
			if (balanceA < balanceB) {
				return 1;
			}
			// if same balance order by Native > CK > others
			return isNativeToken(a) ? -1 : isCkToken(a) && !isNativeToken(b) ? -1 : 1;
		})
	);

	// Count tokens that are not displayed
	const notDisplayedCount: number = $derived(filteredTokens.length - tokensToShow.length);
</script>

<div class="flex flex-col" class:bg-primary={isExpanded}>
	<MultipleListeners tokens={tokenGroup.tokens}>
		<div class="transition duration-300 hover:bg-primary">
			<TokenCard
				data={{
					...headerData,
					tokenCount: filteredTokens.length,
					networks: filteredTokens.map((t) => t.network)
				}}
				testIdPrefix={TOKEN_GROUP}
				on:click={() => toggleIsExpanded(!isExpanded)}
				asGroup
			/>
		</div>
	</MultipleListeners>

	{#if isExpanded}
		<div class="ml-0 flex flex-col gap-1.5 p-2 md:ml-16" transition:slide={SLIDE_PARAMS}>
			{#each tokensToShow as token (token.id)}
				<div
					class="duration-250 flex overflow-hidden rounded-lg bg-secondary transition hover:bg-brand-subtle-10"
					transition:slide={SLIDE_PARAMS}
				>
					<TokenCard data={token} on:click={() => goto(transactionsUrl({ token }))} asNetwork />
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
