<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { NavigationTarget, Page } from '@sveltejs/kit';
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import IconWallet from '$lib/components/icons/IconWallet.svelte';
	import IconActivity from '$lib/components/icons/iconly/IconActivity.svelte';
	import IconlySettings from '$lib/components/icons/iconly/IconlySettings.svelte';
	import IconlyUfo from '$lib/components/icons/iconly/IconlyUfo.svelte';
	import InfoMenu from '$lib/components/navigation/InfoMenu.svelte';
	import NavigationItem from '$lib/components/navigation/NavigationItem.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import {
		NAVIGATION_ITEM_ACTIVITY,
		NAVIGATION_ITEM_EXPLORER,
		NAVIGATION_ITEM_SETTINGS,
		NAVIGATION_ITEM_TOKENS
	} from '$lib/constants/test-ids.constants';
	import { networkId } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		isRouteActivity,
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

	const positionSliderAtSelected = (): void => {
		const slider = document.querySelector<HTMLDivElement>('.slider');
		const selectedItem = document.querySelector<HTMLDivElement>('.menu a.selected');

		if (isNullish(slider) || isNullish(selectedItem)) {
			return;
		}

		const itemRect = selectedItem.getBoundingClientRect();
		const menuRect = selectedItem.closest('.menu')?.getBoundingClientRect();

		if (isNullish(menuRect)) {
			return;
		}

		slider.style.top = `${itemRect.top - menuRect.top}px`;
		slider.style.height = `${itemRect.height}px`;
	};

	onMount(() => {
		positionSliderAtSelected();
	});

	const moveSlider = (event: MouseEvent | TouchEvent): void => {
		const slider = document.querySelector<HTMLDivElement>('.slider');

		if (isNullish(slider)) {
			return;
		}

		const target =
			event instanceof TouchEvent
				? (event.touches[0].target as HTMLElement)
				: (event.target as HTMLElement);

		const itemRect = target.getBoundingClientRect();
		const menuRect = target.closest('.menu')?.getBoundingClientRect();

		if (isNullish(menuRect)) {
			return;
		}

		slider.style.transition = 'top 0.3s ease';
		slider.style.top = `${itemRect.top - menuRect.top}px`;
		slider.style.height = `${itemRect.height}px`;
	};
</script>

<div class="flex h-full w-full flex-col justify-between py-3 pl-4 md:pl-8">
	<div class="menu flex flex-col gap-3">
		<div
			class="slider h-full rounded-xl bg-white text-brand-primary hover:bg-brand-subtle-alt"
		></div>

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
			on:click={moveSlider}
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
			on:click={moveSlider}
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
			testId={NAVIGATION_ITEM_EXPLORER}
			on:click={moveSlider}
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
			on:click={moveSlider}
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

<style lang="scss">
	.menu {
		position: relative;
		overflow: hidden;
	}

	.slider {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 0;
		z-index: -1;
	}
</style>
