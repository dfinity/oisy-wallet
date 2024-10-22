<script lang="ts">
	import ExchangeTokenValue from '$lib/components/exchange/ExchangeTokenValue.svelte';
	import TokenBalance from '$lib/components/tokens/TokenBalance.svelte';
	import TokenCard from '$lib/components/tokens/TokenCard.svelte';
	import TokenCardContent from '$lib/components/tokens/TokenCardContent.svelte';
	import TokenCardWithOnClick from '$lib/components/tokens/TokenCardWithOnClick.svelte';
	import TokenCardWithUrl from '$lib/components/tokens/TokenCardWithUrl.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import TokenName from '$lib/components/tokens/TokenName.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { TOKEN_GROUP } from '$lib/constants/test-ids.constants';
	import type { TokenGroupUi, TokenUi } from '$lib/types/token';
	export let tokenGroup: TokenGroupUi;
	let isOpened = false;

	let tokenGroupHeader: TokenUi;
	$: tokenGroupHeader = {
		...tokenGroup.nativeToken,
		oisySymbol: { oisySymbol: tokenGroup.nativeToken.name },
		oisyName: { oisyName: tokenGroup.name },
		balance: tokenGroup.balance,
		usdBalance: tokenGroup.usdBalance
	};
</script>

<!-- TODO: Add listeners for all tokens in group -->
<TokenCardWithOnClick
	on:click={() => (isOpened = !isOpened)}
	styleClass="group !mb-0 flex gap-3 rounded-xl px-3 py-2 hover:bg-white active:bg-white sm:gap-8 {isOpened
		? 'bg-white rounded-b-none'
		: ''}"
>
	<TokenCard token={tokenGroupHeader} testIdPrefix={TOKEN_GROUP} tokenCount={tokenGroup.tokens.length} />

	<Card noMargin testId={`${TOKEN_GROUP}-${tokenGroup.nativeToken.symbol}`}>
		<div class="flex">
			{tokenGroup.header.name}
		</div>

		<TokenName token={tokenGroupHeader} slot="description" />

		<TokenLogo
			size="md"
			token={tokenGroupHeader}
			tokenCount={tokenGroup.tokens.length}
			color="white"
			slot="icon"
		/>

		<TokenBalance slot="amount" token={tokenGroupHeader} />

		<ExchangeTokenValue slot="amountDescription" token={tokenGroupHeader} />
	</Card>
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
