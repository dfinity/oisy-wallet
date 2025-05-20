<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { NavigationTarget, Page } from '@sveltejs/kit';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import IconGift from '$lib/components/icons/IconGift.svelte';
	import IconWallet from '$lib/components/icons/IconWallet.svelte';
	import AnimatedIconUfo from '$lib/components/icons/animated/AnimatedIconUfo.svelte';
	import IconActivity from '$lib/components/icons/iconly/IconActivity.svelte';
	import IconlySettings from '$lib/components/icons/iconly/IconlySettings.svelte';
	import NavigationItem from '$lib/components/navigation/NavigationItem.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import {
		NAVIGATION_ITEM_ACTIVITY,
		NAVIGATION_ITEM_REWARDS,
		NAVIGATION_ITEM_EXPLORER,
		NAVIGATION_ITEM_SETTINGS,
		NAVIGATION_ITEM_TOKENS
	} from '$lib/constants/test-ids.constants';
	import { networkId } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		isRouteActivity,
		isRouteRewards,
		isRouteDappExplorer,
		isRouteSettings,
		isRouteTokens,
		isRouteTransactions,
		networkUrl
	} from '$lib/utils/nav.utils';

	interface Props {
		testIdPrefix?: string;
	}

	let { testIdPrefix }: Props = $props();

	const addTestIdPrefix = (testId: string): string =>
		nonNullish(testIdPrefix) ? `${testIdPrefix}-${testId}` : testId;

	// If we pass $page directly, we get a type error: for some reason (I cannot find any
	// documentation on it), the type of $page is not `Page`, but `unknown`. So we need to manually
	// cast it to `Page`.
	const pageData: Page = $derived($page);

	const isTransactionsRoute = $derived(isRouteTransactions($page));

	let fromRoute = $state<NavigationTarget | null>(null);

	afterNavigate(({ from }) => {
		fromRoute = from;
	});
</script>

<NavigationItem
	href={networkUrl({
		path: AppPath.Tokens,
		networkId: $networkId,
		usePreviousRoute: isTransactionsRoute,
		fromRoute
	})}
	ariaLabel={$i18n.navigation.alt.tokens}
	selected={isRouteTokens(pageData) || isRouteTransactions(pageData)}
	testId={addTestIdPrefix(NAVIGATION_ITEM_TOKENS)}
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
	testId={addTestIdPrefix(NAVIGATION_ITEM_ACTIVITY)}
>
	<IconActivity />
	{$i18n.navigation.text.activity}
</NavigationItem>

<NavigationItem
	href={networkUrl({
		path: AppPath.Explore,
		networkId: $networkId,
		usePreviousRoute: isTransactionsRoute,
		fromRoute
	})}
	ariaLabel={$i18n.navigation.alt.dapp_explorer}
	selected={isRouteDappExplorer(pageData)}
	testId={addTestIdPrefix(NAVIGATION_ITEM_EXPLORER)}
>
	<AnimatedIconUfo />
	{$i18n.navigation.text.dapp_explorer}
</NavigationItem>

<NavigationItem
	href={networkUrl({
		path: AppPath.Rewards,
		networkId: $networkId,
		usePreviousRoute: isTransactionsRoute,
		fromRoute
	})}
	ariaLabel={$i18n.navigation.alt.airdrops}
	selected={isRouteRewards(pageData)}
	testId={addTestIdPrefix(NAVIGATION_ITEM_REWARDS)}
>
	<IconGift />
	{$i18n.navigation.text.airdrops}
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
	testId={addTestIdPrefix(NAVIGATION_ITEM_SETTINGS)}
>
	<IconlySettings />
	{$i18n.navigation.text.settings}
</NavigationItem>
