<script lang="ts">
	import Listener from '$lib/components/core/Listener.svelte';
	import TokensSkeletons from '$lib/components/tokens/TokensSkeletons.svelte';
	import { combinedDerivedSortedNetworkTokensUi } from '$lib/derived/network-tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token, TokenUi } from '$lib/types/token';
	import { hideZeroBalancesStore } from '$lib/stores/settings.store';
	import { fade } from 'svelte/transition';
	import { modalManageTokens } from '$lib/derived/modal.derived';
	import ManageTokensModal from '$icp-eth/components/tokens/ManageTokensModal.svelte';
	import { flip } from 'svelte/animate';
	import TokenCardWithUrl from '$lib/components/tokens/TokenCardWithUrl.svelte';
	import TokenCardContent from '$lib/components/tokens/TokenCardContent.svelte';
	import { balancesStore } from '$lib/stores/balances.store';
	import { BigNumber } from '@ethersproject/bignumber';
	import { pointerEventStore } from '$lib/stores/events.store';
	import { pointerEventsHandler } from '$lib/utils/events.utils';
	import { debounce, isNullish } from '@dfinity/utils';

	let displayZeroBalance: boolean;
	$: displayZeroBalance = $hideZeroBalancesStore?.enabled !== true;

	let tokens: TokenUi[];
	$: tokens = $combinedDerivedSortedNetworkTokensUi.filter(
		({ id: tokenId }) =>
			($balancesStore?.[tokenId]?.data ?? BigNumber.from(0n)).gt(0n) || displayZeroBalance
	);

	// We start it as undefined to avoid showing an empty list before the first update.
	let tokensToDisplay: Token[] | undefined = undefined;

	const parseTokenKey = (token: Token) => `${token.id.description}-${token.network.id.description}`;

	let tokenKeys: string;
	$: tokenKeys = tokens.map(parseTokenKey).join(',');

	let tokensToDisplayKeys: string;
	$: tokensToDisplayKeys = tokensToDisplay?.map(parseTokenKey).join(',') ?? '';

	const defineTokensToDisplay = (): Token[] | undefined => {
		if (!$pointerEventStore) {
			// No pointer events, so we are not worried about possible glitches on user's interaction.
			return tokens;
		}

		// If there are pointer events, we need to avoid visually re-sorting the tokens, to prevent glitches on user's interaction.

		if (tokenKeys === tokensToDisplayKeys) {
			// The order is the same, so there will be no re-sorting and no possible glitches on user's interaction.
			// However, we need to update the tokensToDisplay to make sure the balances are up-to-date.
			return tokens;
		}

		// The order is not the same, so the list is the same as the one currently showed, but the balances are updated.
		const tokenMap = new Map(tokens.map((token) => [parseTokenKey(token), token]));

		return tokensToDisplay?.map((token) => tokenMap.get(parseTokenKey(token)) ?? token) ?? [];
	};

	const updateTokensToDisplay = () => (tokensToDisplay = defineTokensToDisplay());

	const debounceUpdateTokensToDisplay = debounce(updateTokensToDisplay, 500);

	$: $pointerEventStore, tokens, debounceUpdateTokensToDisplay();

	let animating = false;

	const handleAnimationStart = () => {
		animating = true;

		// The following is to guarantee that the function is triggered, even if 'animationend' event is not triggered.
		// It may happen if the animation aborts before reaching completion.
		debouncedHandleAnimationEnd();
	};

	const handleAnimationEnd = () => (animating = false);

	const debouncedHandleAnimationEnd = debounce(() => {
		if (animating) {
			handleAnimationEnd();
		}
	}, 250);
</script>

<TokensSkeletons loading={isNullish(tokensToDisplay)}>
	<div use:pointerEventsHandler>
		{#each tokensToDisplay ?? [] as token (token.id)}
			<div
				transition:fade
				animate:flip={{ duration: 250 }}
				on:animationstart={handleAnimationStart}
				on:animationend={handleAnimationEnd}
				class:pointer-events-none={animating}
			>
				<Listener {token}>
					<TokenCardWithUrl {token}>
						<TokenCardContent {token} />
					</TokenCardWithUrl>
				</Listener>
			</div>
		{/each}
	</div>

	{#if tokensToDisplay?.length === 0}
		<p class="mt-4 text-dark opacity-50">{$i18n.tokens.text.all_tokens_with_zero_hidden}</p>
	{/if}

	{#if $modalManageTokens}
		<ManageTokensModal />
	{/if}
</TokensSkeletons>
