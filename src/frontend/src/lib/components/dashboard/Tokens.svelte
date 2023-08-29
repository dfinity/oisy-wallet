<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import IconETHQRCode from '$lib/components/icons/IconETHQRCode.svelte';
	import { formatEtherShort } from '$lib/utils/format.utils';
	import { BigNumber } from 'alchemy-sdk';
	import { CURRENCY_SYMBOL } from '$lib/constants/eth.constants';
	import type { TabsContext } from '$lib/stores/tabs.store';
	import { TABS_CONTEXT_KEY } from '$lib/stores/tabs.store';
	import { getContext } from 'svelte';
	import { balance } from '$lib/derived/balances.derived';
	import { tokensStore } from '$lib/stores/tokens.stores';
	import { ETHEREUM_TOKEN, ETHEREUM_TOKEN_ID } from '$lib/constants/tokens.constants';
	import type { Token, TokenId } from '$lib/types/token';
	import { erc20TokensStore } from '$lib/stores/erc20.store';

	const { store: tabsStore }: TabsContext = getContext<TabsContext>(TABS_CONTEXT_KEY);

	const select = (tokenId: TokenId) => {
		tokensStore.select(tokenId);
		tabsStore.select($tabsStore.tabs[1].id);
	};

	let tokens: [Token, ...Token[]] = [ETHEREUM_TOKEN];
	$: tokens = [ETHEREUM_TOKEN, ...$erc20TokensStore];
</script>

{#each tokens as token}
	<button class="block" on:click={() => select(token.id)} style="width: 100%">
		<Card>
			{token.name}

			<IconETHQRCode slot="icon" />

			<div class="font-normal break-words" slot="description">
				{formatEtherShort($balance ?? BigNumber.from(0n))}
				{CURRENCY_SYMBOL}
			</div>
		</Card>
	</button>
{/each}
