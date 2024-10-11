<script lang="ts">
	import { page } from '$app/stores';
	import IconSettings from '$lib/components/icons/IconSettings.svelte';
	import IconWallet from '$lib/components/icons/IconWallet.svelte';
	import NavigationItem from '$lib/components/navigation/NavigationItem.svelte';
	import { networkId } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { isRouteSettings, isRouteTransactions, networkParam } from '$lib/utils/nav.utils.js';

	let route: 'transactions' | 'tokens' | 'settings' = 'tokens';
	$: route = isRouteSettings($page)
		? 'settings'
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
</div>
