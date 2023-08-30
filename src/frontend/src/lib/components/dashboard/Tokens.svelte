<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import { formatEtherShort } from '$lib/utils/format.utils';
	import { BigNumber } from 'alchemy-sdk';
	import type { TabsContext } from '$lib/stores/tabs.store';
	import { TABS_CONTEXT_KEY } from '$lib/stores/tabs.store';
	import { getContext } from 'svelte';
	import { tokenIdStore } from '$lib/stores/token-id.stores';
	import { ETHEREUM_TOKEN } from '$lib/constants/tokens.constants';
	import type { Token, TokenId } from '$lib/types/token';
	import { erc20TokensStore } from '$lib/stores/erc20.store';
	import oisy from '$lib/assets/oisy.svg';
	import Img from '$lib/components/ui/Img.svelte';
	import { balancesStore } from '$lib/stores/balances.store';

	const { store: tabsStore }: TabsContext = getContext<TabsContext>(TABS_CONTEXT_KEY);

	const select = (tokenId: TokenId) => {
		tokenIdStore.select(tokenId);
		tabsStore.select($tabsStore.tabs[1].id);
	};

	let tokens: [Token, ...Token[]] = [ETHEREUM_TOKEN];
	$: tokens = [ETHEREUM_TOKEN, ...$erc20TokensStore];
</script>

{#each tokens as token}
	<button class="block" on:click={() => select(token.id)} style="width: 100%">
		<Card>
			{token.name}

			<Img src={token.icon ?? oisy} slot="icon" />

			<div class="font-normal break-words" slot="description">
				{formatEtherShort($balancesStore?.[token.id] ?? BigNumber.from(0n))}
				{token.symbol}
			</div>
		</Card>
	</button>
{/each}
