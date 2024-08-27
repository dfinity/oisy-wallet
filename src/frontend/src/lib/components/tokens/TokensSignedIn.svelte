<script lang="ts">
	import Listener from '$lib/components/core/Listener.svelte';
	import TokensSkeletons from '$lib/components/tokens/TokensSkeletons.svelte';
	import { combinedDerivedSortedNetworkTokensUi } from '$lib/derived/network-tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { TokenUi } from '$lib/types/token';
	import { hideZeroBalancesStore } from '$lib/stores/settings.store';
	import { fade } from 'svelte/transition';
	import { modalManageTokens } from '$lib/derived/modal.derived';
	import ManageTokensModal from '$icp-eth/components/tokens/ManageTokensModal.svelte';
	import { flip } from 'svelte/animate';
	import TokenCardWithUrl from '$lib/components/tokens/TokenCardWithUrl.svelte';
	import TokenCardContent from '$lib/components/tokens/TokenCardContent.svelte';
	import { balancesStore } from '$lib/stores/balances.store';
	import { BigNumber } from '@ethersproject/bignumber';
	import { debounce } from '@dfinity/utils';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';

	let displayZeroBalance: boolean;
	$: displayZeroBalance = $hideZeroBalancesStore?.enabled !== true;

	let tokens: TokenUi[];
	$: tokens = $combinedDerivedSortedNetworkTokensUi.filter(
		({ id: tokenId }) =>
			($balancesStore?.[tokenId]?.data ?? BigNumber.from(0n)).gt(0n) || displayZeroBalance
	);

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

	let loading: boolean;
	$: loading = $erc20UserTokensNotInitialized;
</script>

<TokensSkeletons {loading}>
	{#each tokens as token (token.id)}
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

	{#if tokens.length === 0}
		<p class="mt-4 text-dark opacity-50">{$i18n.tokens.text.all_tokens_with_zero_hidden}</p>
	{/if}

	{#if $modalManageTokens}
		<ManageTokensModal />
	{/if}
</TokensSkeletons>
