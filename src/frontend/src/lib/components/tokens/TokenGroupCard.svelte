<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import MultipleListeners from '$lib/components/core/MultipleListeners.svelte';
	import ExchangeTokenValue from '$lib/components/exchange/ExchangeTokenValue.svelte';
	import TokenBalance from '$lib/components/tokens/TokenBalance.svelte';
	import TokenCardContent from '$lib/components/tokens/TokenCardContent.svelte';
	import TokenCardWithOnClick from '$lib/components/tokens/TokenCardWithOnClick.svelte';
	import TokenCardWithUrl from '$lib/components/tokens/TokenCardWithUrl.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import TokenName from '$lib/components/tokens/TokenName.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { TOKEN_GROUP } from '$lib/constants/test-ids.constants';
	import type { TokenFinancialData, TokenGroupUi, TokenUi } from '$lib/types/token';

	export let tokenGroup: TokenGroupUi;
	let isOpened = false;

	// TODO: calculate these in the grouping function to reduce loops
	let groupFinancialData: TokenFinancialData;
	$: groupFinancialData = tokenGroup.tokens.reduce<{
		balance: TokenUi['balance'];
		usdBalance: TokenUi['usdBalance'];
	}>(
		(acc, token: TokenUi) => ({
			balance:
				nonNullish(acc.balance) && nonNullish(token.balance)
					? acc.balance.add(token.balance)
					: token.balance,
			usdBalance:
				nonNullish(acc.usdBalance) && nonNullish(token.usdBalance)
					? acc.usdBalance + token.usdBalance
					: token.usdBalance
		}),
		{ balance: undefined, usdBalance: undefined }
	);

	let groupHeaderToken: TokenUi;
	$: groupHeaderToken = {
		...tokenGroup.nativeToken,
		...groupFinancialData
	};
</script>

<MultipleListeners tokens={tokenGroup.tokens}>
	<TokenCardWithOnClick
		on:click={() => (isOpened = !isOpened)}
		styleClass="group !mb-0 flex gap-3 rounded-xl px-3 py-2 hover:bg-white active:bg-white sm:gap-8 {isOpened
			? 'bg-white rounded-b-none'
			: ''}"
	>
		<Card noMargin testId={`${TOKEN_GROUP}-${tokenGroup.header.symbol}`}>
			<div class="flex">
				{tokenGroup.header.name}
			</div>

			<TokenName token={groupHeaderToken} slot="description" />

			<TokenLogo
				size="md"
				token={groupHeaderToken}
				tokenCount={tokenGroup.tokens.length}
				color="white"
				slot="icon"
			/>

			<TokenBalance slot="amount" token={groupHeaderToken} />

			<ExchangeTokenValue slot="amountDescription" token={groupHeaderToken} />
		</Card>
	</TokenCardWithOnClick>
</MultipleListeners>

{#if isOpened}
	<div class="rounded-b-xl bg-white/40 pt-2">
		{#each tokenGroup.tokens as token}
			<TokenCardWithUrl {token}>
				<TokenCardContent logoSize="md" {token} />
			</TokenCardWithUrl>
		{/each}
	</div>
{/if}
