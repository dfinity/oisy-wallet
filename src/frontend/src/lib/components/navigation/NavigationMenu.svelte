<script lang="ts">
	import type { NavigationTarget, Page } from '@sveltejs/kit';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import { AIRDROPS_ENABLED } from '$env/airdrops.env';
	import IconGift from '$lib/components/icons/IconGift.svelte';
	import IconWallet from '$lib/components/icons/IconWallet.svelte';
	import IconActivity from '$lib/components/icons/iconly/IconActivity.svelte';
	import IconlySettings from '$lib/components/icons/iconly/IconlySettings.svelte';
	import IconlyUfo from '$lib/components/icons/iconly/IconlyUfo.svelte';
	import InfoMenu from '$lib/components/navigation/InfoMenu.svelte';
	import NavigationItem from '$lib/components/navigation/NavigationItem.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import {
		NAVIGATION_ITEM_ACTIVITY,
		NAVIGATION_ITEM_AIRDROPS,
		NAVIGATION_ITEM_EXPLORER,
		NAVIGATION_ITEM_SETTINGS,
		NAVIGATION_ITEM_TOKENS
	} from '$lib/constants/test-ids.constants';
	import { networkId } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		isRouteActivity,
		isRouteAirdrops,
		isRouteDappExplorer,
		isRouteSettings,
		isRouteTokens,
		isRouteTransactions,
		networkUrl
	} from '$lib/utils/nav.utils';

	// If we pass $page directly, we get a type error: for some reason (I cannot find any
	// documentation on it), the type of $page is not `Page`, but `unknown`. So we need to manually
	// cast it to `Page`.
	let pageData: Page;
	$: pageData = $page;

	let isTransactionsRoute = false;
	$: isTransactionsRoute = isRouteTransactions($page);

	let fromRoute: NavigationTarget | null;

	afterNavigate(({ from }) => {
		fromRoute = from;
	});
</script>

<div class="flex h-full w-full flex-col justify-between py-3 pl-4 md:pl-8">
	<div class="flex flex-col gap-3">
		<NavigationItem
			href={networkUrl({
				path: AppPath.Tokens,
				networkId: $networkId,
				usePreviousRoute: isTransactionsRoute,
				fromRoute
			})}
			ariaLabel={$i18n.navigation.alt.tokens}
			selected={isRouteTokens(pageData) || isRouteTransactions(pageData)}
			testId={NAVIGATION_ITEM_TOKENS}
		>
			<IconWallet />
			{$i18n.navigation.text.tokens}
		</NavigationItem>

		<NavigationItem
			href={networkUrl({
				path: AppPath.Activity,
				networkId: $networkId,
				usePreviousRoute: isTransactionsRoute,
				fromRoute
			})}
			ariaLabel={$i18n.navigation.alt.activity}
			selected={isRouteActivity(pageData)}
			testId={NAVIGATION_ITEM_ACTIVITY}
		>
			<IconActivity />
			{$i18n.navigation.text.activity}
		</NavigationItem>

		{#if AIRDROPS_ENABLED}
			<NavigationItem
				href={networkUrl({
					path: AppPath.Airdrops,
					networkId: $networkId,
					usePreviousRoute: isTransactionsRoute,
					fromRoute
				})}
				ariaLabel={$i18n.navigation.alt.airdrops}
				selected={isRouteAirdrops(pageData)}
				testId={NAVIGATION_ITEM_AIRDROPS}
			>
				<IconGift />
				{$i18n.navigation.text.airdrops}
			</NavigationItem>
		{/if}

		<NavigationItem
			href={networkUrl({
				path: AppPath.Explore,
				networkId: $networkId,
				usePreviousRoute: isTransactionsRoute,
				fromRoute
			})}
			ariaLabel={$i18n.navigation.alt.dapp_explorer}
			selected={isRouteDappExplorer(pageData)}
			testId={NAVIGATION_ITEM_EXPLORER}
		>
			<IconlyUfo />
			{$i18n.navigation.text.dapp_explorer}
		</NavigationItem>

		<NavigationItem
			href={networkUrl({
				path: AppPath.Settings,
				networkId: $networkId,
				usePreviousRoute: isTransactionsRoute,
				fromRoute
			})}
			ariaLabel={$i18n.navigation.alt.settings}
			selected={isRouteSettings(pageData)}
			testId={NAVIGATION_ITEM_SETTINGS}
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
