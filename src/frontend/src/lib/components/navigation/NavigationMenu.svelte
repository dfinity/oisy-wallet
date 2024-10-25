<script lang="ts">
	import { page } from '$app/stores';
	import IconWallet from '$lib/components/icons/IconWallet.svelte';
	import IconlySettings from '$lib/components/icons/iconly/IconlySettings.svelte';
	import IconlyUfo from '$lib/components/icons/iconly/IconlyUfo.svelte';
	import InfoMenu from '$lib/components/navigation/InfoMenu.svelte';
	import NavigationItem from '$lib/components/navigation/NavigationItem.svelte';
	import { networkId } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		isRouteDappExplorer,
		isRouteSettings,
		isRouteTransactions,
		networkParam
	} from '$lib/utils/nav.utils.js';

	let route: 'transactions' | 'tokens' | 'settings' | 'explore' = 'tokens';
	$: route = isRouteSettings($page)
		? 'settings'
		: isRouteDappExplorer($page)
			? 'explore'
			: isRouteTransactions($page)
				? 'transactions'
				: 'tokens';
</script>

<div class="flex h-full w-full flex-col justify-between py-3 pl-4 md:pl-8">
	<div class="flex flex-col gap-3">
		<NavigationItem
			href="/"
			ariaLabel={$i18n.navigation.alt.tokens}
			selected={route === 'tokens' || route === 'transactions'}
		>
			<IconWallet />
			{$i18n.navigation.text.tokens}
		</NavigationItem>

		<NavigationItem
			href={`/explore`}
			ariaLabel={$i18n.navigation.alt.dapp_explorer}
			selected={route === 'explore'}
		>
			<IconlyUfo />
			{$i18n.navigation.text.dapp_explorer}
		</NavigationItem>

		<NavigationItem
			href={`/settings?${networkParam($networkId)}`}
			ariaLabel={$i18n.navigation.alt.settings}
			selected={route === 'settings'}
		>
			<IconlySettings />
			{$i18n.navigation.text.settings}
		</NavigationItem>
	</div>

	<div class="my-4 flex h-full flex-col justify-center">
		<slot />
	</div>

	<InfoMenu />
</div>
