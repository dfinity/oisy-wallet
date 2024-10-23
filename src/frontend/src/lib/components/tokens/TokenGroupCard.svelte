<script lang="ts">
	import { slide } from 'svelte/transition';
	import TokenCard from '$lib/components/tokens/TokenCard.svelte';
	import TokenCardContent from '$lib/components/tokens/TokenCardContent.svelte';
	import TokenCardWithOnClick from '$lib/components/tokens/TokenCardWithOnClick.svelte';
	import TokenCardWithUrl from '$lib/components/tokens/TokenCardWithUrl.svelte';
	import { TOKEN_GROUP } from '$lib/constants/test-ids.constants';
	import { SLIDE_PARAMS } from '$lib/constants/transition.constants';
	import type { TokenUiGroup } from '$lib/types/token';
	import type { CardData } from '$lib/types/token-card';

	export let tokenGroup: TokenUiGroup;

	let isOpened = false;

	let { nativeToken } = tokenGroup;

	let headerData: CardData;
	$: headerData = {
		symbol: nativeToken.symbol,
		name: nativeToken.name,
		decimals: nativeToken.decimals,
		network: nativeToken.network,
		oisySymbol: { oisySymbol: nativeToken.name },
		oisyName: { oisyName: tokenGroup.header.name },
		balance: tokenGroup.balance,
		usdBalance: tokenGroup.usdBalance
	};
</script>

<div class="flex flex-col">
	<!-- TODO: Add listeners for all tokens in group -->
	<TokenCardWithOnClick
		on:click={() => (isOpened = !isOpened)}
		styleClass="rounded-xl px-3 py-2 hover:bg-white active:bg-white {isOpened
			? 'bg-white rounded-b-none'
			: ''}"
	>
		<TokenCard data={headerData} testIdPrefix={TOKEN_GROUP} tokenCount={tokenGroup.tokens.length} />
	</TokenCardWithOnClick>

	{#if isOpened}
		<div class="flex flex-col gap-3 rounded-b-xl bg-white/40 pt-2" transition:slide={SLIDE_PARAMS}>
			{#each tokenGroup.tokens as token (token.id)}
				<TokenCardWithUrl {token}>
					<TokenCardContent logoSize="md" data={token} />
				</TokenCardWithUrl>
			{/each}
		</div>
	{/if}
</div>
