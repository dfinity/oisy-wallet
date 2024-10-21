<script lang="ts">
	import { BigNumber } from '@ethersproject/bignumber';
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
	import { LogoSize } from '$lib/types/logo-size';
	import type { TokenGroupUi, TokenUi } from '$lib/types/token';
	import { isNullish } from '@dfinity/utils';
	import { groupsStore } from '$lib/stores/groups.store.js';

	export let tokenGroup: TokenGroupUi;

	$: totalBalance = tokenGroup.tokens.reduce(
		(sum, token: TokenUi) => sum.add(token.balance ?? BigNumber.from(0)),
		BigNumber.from(0)
	);
	$: totalUsdBalance = tokenGroup.tokens.reduce(
		(sum, token: TokenUi) => sum + (token.usdBalance ?? 0),
		0
	);
	$: tokenGroupBalance = {
		balance: totalBalance,
		symbol: tokenGroup.header.symbol,
		decimals: tokenGroup.header.decimals,
		usdBalance: totalUsdBalance
	};

	$: groups = $groupsStore ?? {};
	$: expanded = groups[Symbol.keyFor(tokenGroup.id)]?.expanded ?? false;

	const toggleExpand = (expanded: boolean) => {
		const idString = Symbol.keyFor(tokenGroup.id);
		if (isNullish(idString)) {
			throw new Error('Invalid TokenGroupId Symbol');
		}
		const updatedData = { ...groups, [idString]: { expanded: expanded }};
		groupsStore.set({ key: 'groups', value: updatedData });
	}
</script>

<TokenCardWithOnClick
	on:click={() => (toggleExpand(!expanded))}
	styleClass="!m-0 py-2 px-3 w-full rounded-xl hover:text-blue-ribbon hover:bg-white {expanded
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
		<ExchangeTokenValue slot="amountDescription" token={tokenGroupBalance} />
	</Card>
</TokenCardWithOnClick>

{#if expanded}
	<div class="rounded-b-xl bg-white/40 pt-2">
		{#each tokenGroup.tokens as token}
			<Listener {token}>
				<TokenCardWithUrl {token}>
					<TokenCardContent logoStyleClass="mx-[5px]" logoSize={LogoSize.SM} {token} />
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
