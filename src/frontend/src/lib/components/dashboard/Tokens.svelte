<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import IconETHQRCode from '$lib/components/icons/IconETHQRCode.svelte';
	import { formatEtherShort } from '$lib/utils/format.utils';
	import { balanceStore } from '$lib/stores/balance.store';
	import { BigNumber } from 'alchemy-sdk';
	import { CURRENCY_SYMBOL } from '$lib/constants/eth.constants';
	import type { TabsContext } from '$lib/stores/tabs.store';
	import { getContext } from 'svelte';
	import { TABS_CONTEXT_KEY } from '$lib/stores/tabs.store';

	const { store: tabsStore }: TabsContext = getContext<TabsContext>(TABS_CONTEXT_KEY);
</script>

<button class="block" on:click={() => tabsStore.select($tabsStore.tabs[1].id)} style="width: 100%">
	<Card>
		Ethereum

		<IconETHQRCode slot="icon" />

		<div class="font-normal break-words" slot="description">
			{formatEtherShort($balanceStore ?? BigNumber.from(0n))}
			{CURRENCY_SYMBOL}
		</div>
	</Card>
</button>
