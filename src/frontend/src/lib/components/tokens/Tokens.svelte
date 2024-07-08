<script lang="ts">
	import { BigNumber } from '@ethersproject/bignumber';
	import { balancesStore } from '$lib/stores/balances.store';
	import Listener from '$lib/components/core/Listener.svelte';
	import TokensSkeletons from '$lib/components/tokens/TokensSkeletons.svelte';
	import { enabledNetworkTokens } from '$lib/derived/network-tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import { hideZeroBalancesStore } from '$lib/stores/settings.store';
	import { fade } from 'svelte/transition';
	import { modalManageTokens } from '$lib/derived/modal.derived';
	import ManageTokensModal from '$icp-eth/components/tokens/ManageTokensModal.svelte';
	import TokenCard from '$lib/components/tokens/TokenCard.svelte';

	let displayZeroBalance: boolean;
	$: displayZeroBalance = $hideZeroBalancesStore?.enabled !== true;

	let tokens: Token[];
	$: tokens = $enabledNetworkTokens.filter(
		({ id: tokenId }) =>
			($balancesStore?.[tokenId]?.data ?? BigNumber.from(0n)).gt(0n) || displayZeroBalance
	);
</script>

<TokensSkeletons>
	{#each tokens as token (token.id)}
		<Listener {token}>
			<div in:fade>
				<TokenCard {token} />
			</div>
		</Listener>
	{/each}

	{#if tokens.length === 0}
		<p class="mt-4 text-dark opacity-50">{$i18n.tokens.text.all_tokens_with_zero_hidden}</p>
	{/if}

	{#if $modalManageTokens}
		<ManageTokensModal />
	{/if}
</TokensSkeletons>
