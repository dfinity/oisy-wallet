<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import NavigationItem from '$lib/components/navigation/NavigationItem.svelte';
	import { networkId } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { isRouteSettings, isRouteTransactions, networkParam } from '$lib/utils/nav.utils.js';
	import IconWallet from '$lib/components/icons/IconWallet.svelte';
	import IconSettings from '$lib/components/icons/IconSettings.svelte';

	let route: 'transactions' | 'tokens' | 'settings' = 'tokens';
	$: route = isRouteSettings($page)
		? 'settings'
		: isRouteTransactions($page)
			? 'transactions'
			: 'tokens';

	const gotoAssets = async () => {
		await goto('/');
	};

	const gotoSettings = async () => {
		await goto(`/settings?${networkParam($networkId)}`);
	};
</script>

<div class=" flex w-full flex-col gap-3 py-3">
	<NavigationItem
		ariaLabel={$i18n.navigation.text.homepage}
		selected={route === 'tokens' || route === 'transactions'}
		on:click={gotoAssets}>
		<IconWallet />
		{$i18n.navigation.text.homepage}
	</NavigationItem	>

	<NavigationItem
		ariaLabel={$i18n.navigation.text.settings}
		selected={route === 'settings'}
		on:click={gotoSettings}>
		<IconSettings />
		{$i18n.navigation.text.settings}
	</NavigationItem	>
</div>
