<script lang="ts">
	import Listener from '$lib/components/core/Listener.svelte';
	import TokenCardWithUrl from '$lib/components/tokens/TokenCardWithUrl.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import TokenName from '$lib/components/tokens/TokenName.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { TOKEN_GROUP } from '$lib/constants/test-ids.constants';
	import type { TokenGroupUi, TokenUi } from '$lib/types/token';
	import TokenCardWithOnClick from '$lib/components/tokens/TokenCardWithOnClick.svelte';
	import TokenCardContent from '$lib/components/tokens/TokenCardContent.svelte';
	import ExchangeTokenValue from '$lib/components/exchange/ExchangeTokenValue.svelte';
	import TokenBalance from '$lib/components/tokens/TokenBalance.svelte';
	import { BigNumber } from '@ethersproject/bignumber';
	import { LogoSize } from '$lib/types/logo-size';

	export let tokenGroup: TokenGroupUi;
	let isOpened: boolean = false;

	$: totalBalance = tokenGroup.tokens.reduce((sum, token: TokenUi) => sum.add(token.balance ?? BigNumber.from(0)), BigNumber.from(0));
	$: totalUsdBalance = tokenGroup.tokens.reduce((sum, token: TokenUi) => sum + (token.usdBalance ?? 0), 0);
	$: tokenGroupBalance = { balance: totalBalance, symbol: tokenGroup.header.symbol, decimals: tokenGroup.header.decimals, usdBalance: totalUsdBalance };
</script>

<TokenCardWithOnClick on:click={()=> isOpened = !isOpened}
											styleClass="!m-0 py-2 px-3 w-full rounded-xl hover:text-blue-ribbon hover:bg-white {isOpened ? 'bg-white rounded-b-none' : ''}">

	<Card noMargin testId={`${TOKEN_GROUP}-${tokenGroup.header.symbol}`}>

		<div class="flex">
			{tokenGroup.header.name}
		</div>
		<TokenName token={{name: tokenGroup.header.symbol}} slot="description" />

		<div class="relative" slot="icon">
			<TokenLogo token={{name: tokenGroup.header.name, icon: tokenGroup.header.icon, network: tokenGroup.nativeNetwork}}
								 showNetworkIcon={false} color="white" />
			<span
				class="token-count border border-light-grey h-6 w-6 font-semibold absolute bottom-0 flex items-center justify-center -right-2.5 rounded-full bg-white">{tokenGroup.tokens.length}</span>
		</div>

		<TokenBalance slot="amount" token={tokenGroupBalance} />
		<ExchangeTokenValue slot="amountDescription" token={tokenGroupBalance} />

	</Card>
</TokenCardWithOnClick>

{#if isOpened}
	<div class="bg-white/40 rounded-b-xl pt-2">
		{#each tokenGroup.tokens as token}
			<Listener {token}>
				<TokenCardWithUrl {token}>
					<TokenCardContent logoSize={LogoSize.SM} {token} />
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