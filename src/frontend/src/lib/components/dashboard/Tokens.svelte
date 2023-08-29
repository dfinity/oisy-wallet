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
	import { Token } from '$lib/enums/token';

	const { store: tabsStore }: TabsContext = getContext<TabsContext>(TABS_CONTEXT_KEY);

	const selectEthereum = () => {
		tokensStore.select(Token.ETHEREUM);
		tabsStore.select($tabsStore.tabs[1].id);
	};
</script>

<button class="block" on:click={selectEthereum} style="width: 100%">
	<Card>
		Ethereum

		<IconETHQRCode slot="icon" />

		<div class="font-normal break-words" slot="description">
			{formatEtherShort($balance ?? BigNumber.from(0n))}
			{CURRENCY_SYMBOL}
		</div>
	</Card>
</button>
