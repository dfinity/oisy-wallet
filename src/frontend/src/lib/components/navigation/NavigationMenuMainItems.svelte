<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { NavigationTarget } from '@sveltejs/kit';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { EARNING_ENABLED } from '$env/earning';
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
	import { TokenTypes } from '$lib/enums/token-types';
	import { i18n } from '$lib/stores/i18n.store';
	import { userSelectedNetworkStore, activeAssetsTabStore } from '$lib/stores/settings.store';
	import {
		isRouteActivity,
		isRouteRewards,
		isRouteDappExplorer,
		isRouteSettings,
		isRouteTransactions,
		networkUrl,
		isRouteEarn,
		isRouteTokens,
		isRouteNfts
	} from '$lib/utils/nav.utils';
	import { parseNetworkId } from '$lib/validation/network.validation.js';

	interface Props {
		testIdPrefix?: string;
	}

	let { testIdPrefix }: Props = $props();

	const addTestIdPrefix = (testId: string): string =>
		nonNullish(testIdPrefix) ? `${testIdPrefix}-${testId}` : testId;

	const isTransactionsRoute = $derived(isRouteTransactions(page));

	const networkId = $derived(
		nonNullish($userSelectedNetworkStore) ? parseNetworkId($userSelectedNetworkStore) : undefined
	);

	let fromRoute = $state<NavigationTarget | null>(null);

	afterNavigate(({ from }) => {
		fromRoute = from;
	});
</script>

<NavigationItem
	ariaLabel={$i18n.navigation.alt.tokens}
	href={networkUrl({
		path: $activeAssetsTabStore === TokenTypes.NFTS ? AppPath.Nfts : AppPath.Tokens,
		networkId,
		usePreviousRoute: isTransactionsRoute,
		fromRoute
	})}
	selected={isRouteTokens(page) || isRouteNfts(page) || isRouteTransactions(page)}
	testId={addTestIdPrefix(NAVIGATION_ITEM_TOKENS)}
>
	{#snippet icon()}
		<IconWallet />
	{/snippet}
	{#snippet label()}
		{$i18n.navigation.text.tokens}
	{/snippet}
</NavigationItem>

<NavigationItem
	ariaLabel={$i18n.navigation.alt.activity}
	href={networkUrl({
		path: AppPath.Activity,
		networkId,
		usePreviousRoute: isTransactionsRoute,
		fromRoute
	})}
	selected={isRouteActivity(page)}
	testId={addTestIdPrefix(NAVIGATION_ITEM_ACTIVITY)}
>
	{#snippet icon()}
		<IconActivity />
	{/snippet}

	{#snippet label()}
		{$i18n.navigation.text.activity}
	{/snippet}
</NavigationItem>

<NavigationItem
	ariaLabel={$i18n.navigation.alt.dapp_explorer}
	href={networkUrl({
		path: AppPath.Explore,
		networkId,
		usePreviousRoute: isTransactionsRoute,
		fromRoute
	})}
	selected={isRouteDappExplorer(page)}
	testId={addTestIdPrefix(NAVIGATION_ITEM_EXPLORER)}
>
	{#snippet icon()}
		<AnimatedIconUfo />
	{/snippet}
	{#snippet label()}
		{$i18n.navigation.text.dapp_explorer}
	{/snippet}
</NavigationItem>

<!-- Todo: remove condition once the feature is completed -->
{#if EARNING_ENABLED}
	<NavigationItem
		ariaLabel={$i18n.navigation.alt.airdrops}
		href={networkUrl({
			path: AppPath.Earn,
			networkId,
			usePreviousRoute: isTransactionsRoute,
			fromRoute
		})}
		selected={isRouteEarn(page)}
		tag={$i18n.core.text.new}
		tagVariant="emphasis"
		testId={addTestIdPrefix(NAVIGATION_ITEM_REWARDS)}
	>
		{#snippet icon()}
			<IconGift />
		{/snippet}
		{#snippet label()}
			{$i18n.navigation.text.earning}
		{/snippet}
	</NavigationItem>
{:else}
	<NavigationItem
		ariaLabel={$i18n.navigation.alt.airdrops}
		href={networkUrl({
			path: AppPath.Rewards,
			networkId,
			usePreviousRoute: isTransactionsRoute,
			fromRoute
		})}
		selected={isRouteRewards(page)}
		tag={$i18n.core.text.new}
		tagVariant="emphasis"
		testId={addTestIdPrefix(NAVIGATION_ITEM_REWARDS)}
	>
		{#snippet icon()}
			<IconGift />
		{/snippet}
		{#snippet label()}
			{$i18n.navigation.text.airdrops}
		{/snippet}
	</NavigationItem>
{/if}

<NavigationItem
	ariaLabel={$i18n.navigation.alt.settings}
	href={networkUrl({
		path: AppPath.Settings,
		networkId,
		usePreviousRoute: isTransactionsRoute,
		fromRoute
	})}
	selected={isRouteSettings(page)}
	testId={addTestIdPrefix(NAVIGATION_ITEM_SETTINGS)}
>
	{#snippet icon()}
		<IconlySettings />
	{/snippet}
	{#snippet label()}
		{$i18n.navigation.text.settings}
	{/snippet}
</NavigationItem>
