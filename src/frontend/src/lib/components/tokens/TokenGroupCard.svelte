<script lang="ts">
	import TokenCard from '$lib/components/tokens/TokenCard.svelte';
	import TokenCardContent from '$lib/components/tokens/TokenCardContent.svelte';
	import TokenCardWithOnClick from '$lib/components/tokens/TokenCardWithOnClick.svelte';
	import TokenCardWithUrl from '$lib/components/tokens/TokenCardWithUrl.svelte';
	import { TOKEN_GROUP } from '$lib/constants/test-ids.constants';
	import type { TokenGroupUi, TokenUi } from '$lib/types/token';

	export let tokenGroup: TokenGroupUi;

	let isOpened = false;

	let tokenGroupHeader: TokenUi;
	$: tokenGroupHeader = {
		...tokenGroup.nativeToken,
		oisySymbol: { oisySymbol: tokenGroup.nativeToken.name },
		oisyName: { oisyName: tokenGroup.header.name },
		balance: tokenGroup.balance,
		usdBalance: tokenGroup.usdBalance
	};

	let openedStyleClass: string;
	$: isOpened, (openedStyleClass = isOpened ? 'bg-white rounded-b-none' : '');
</script>

<div class="flex flex-col">
	<!-- TODO: Add listeners for all tokens in group -->
	<TokenCardWithOnClick
		on:click={() => (isOpened = !isOpened)}
		styleClass="rounded-xl px-3 py-2 hover:bg-white active:bg-white {openedStyleClass}"
	>
		<TokenCard
			token={tokenGroupHeader}
			testIdPrefix={TOKEN_GROUP}
			tokenCount={tokenGroup.tokens.length}
		/>
	</TokenCardWithOnClick>

	{#if isOpened}
		<div class="rounded-b-xl bg-white/40 pt-2">
			{#each tokenGroup.tokens as token (token.id)}
				<TokenCardWithUrl {token}>
					<TokenCardContent logoSize="md" {token} />
				</TokenCardWithUrl>
			{/each}
		</div>
	{/if}
</div>
