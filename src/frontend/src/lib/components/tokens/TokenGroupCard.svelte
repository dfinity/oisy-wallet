<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Listener from '$lib/components/core/Listener.svelte';
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

	let tokenGroupBalance: TokenUi;
	$: tokenGroupBalance = {
		...tokenGroup.header,
		...groupFinancialData
	};
</script>

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
		<TokenName token={{ name: tokenGroup.header.symbol }} slot="description" />

		<div class="relative" slot="icon">
			<TokenLogo
				size="md"
				token={{
					name: tokenGroup.header.name,
					icon: tokenGroup.header.icon,
					network: tokenGroup.nativeNetwork
				}}
				showNetworkIcon={false}
				color="white"
			/>
			<span
				class="token-count absolute -right-2.5 bottom-0 flex h-6 w-6 items-center justify-center rounded-full border-[0.5px] border-light-grey bg-white text-sm font-semibold"
				>{tokenGroup.tokens.length}</span
			>
		</div>

		<TokenBalance slot="amount" token={tokenGroupBalance} />
		<ExchangeTokenValue slot="amountDescription" tokenUi={tokenGroupBalance} />
	</Card>
</TokenCardWithOnClick>

{#if isOpened}
	<div class="rounded-b-xl bg-white/40 pt-2">
		{#each tokenGroup.tokens as token}
			<Listener {token}>
				<TokenCardWithUrl {token}>
					<TokenCardContent logoStyleClass="mx-[5px]" logoSize={42} {token} />
				</TokenCardWithUrl>
			</Listener>
		{/each}
	</div>
{/if}

<style lang="scss">
	.token-count {
		color: var(--color-secondary);
	}
</style>
