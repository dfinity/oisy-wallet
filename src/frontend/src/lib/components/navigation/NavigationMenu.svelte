<script lang="ts">
	import { page } from '$app/stores';
	import IconGlasses from '$lib/components/icons/IconGlasses.svelte';
	import IconSettings from '$lib/components/icons/IconSettings.svelte';
	import IconWallet from '$lib/components/icons/IconWallet.svelte';
	import NavigationItem from '$lib/components/navigation/NavigationItem.svelte';
	import { networkId } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		isRouteSettings,
		isRouteDApps,
		isRouteTransactions,
		networkParam
	} from '$lib/utils/nav.utils.js';

	let route: 'transactions' | 'tokens' | 'settings' | 'dapps' = 'tokens';
	$: route = isRouteSettings($page)
		? 'settings'
		: isRouteDApps($page)
			? 'dapps'
			: isRouteTransactions($page)
				? 'transactions'
				: 'tokens';
</script>

<div class=" flex w-full flex-col gap-3 py-3">
	<NavigationItem
		href="/"
		ariaLabel={$i18n.navigation.alt.tokens}
		selected={route === 'tokens' || route === 'transactions'}
	>
		<IconWallet />
		{$i18n.navigation.text.tokens}
	</NavigationItem>

	<NavigationItem
		href={`/settings?${networkParam($networkId)}`}
		ariaLabel={$i18n.navigation.alt.settings}
		selected={route === 'settings'}
	>
		<IconSettings />
		{$i18n.navigation.text.settings}
	</NavigationItem>

	<NavigationItem
		href={`/dapps`}
		ariaLabel={$i18n.navigation.alt.dapps}
		selected={route === 'dapps'}
	>
		<IconGlasses />
		{$i18n.navigation.text.dapps}
	</NavigationItem>
</div>
