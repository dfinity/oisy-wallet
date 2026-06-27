<script lang="ts">
	import { assertNever, nonNullish } from '@dfinity/utils';
	import type { NavigationTarget } from '@sveltejs/kit';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { EARNING_ENABLED } from '$env/earning';
	import { TRADING_ENABLED } from '$env/trading';
	import IconGift from '$lib/components/icons/IconGift.svelte';
	import IconPlant from '$lib/components/icons/IconPlant.svelte';
	import IconWallet from '$lib/components/icons/IconWallet.svelte';
	import AnimatedIconUfo from '$lib/components/icons/animated/AnimatedIconUfo.svelte';
	import IconActivity from '$lib/components/icons/iconly/IconActivity.svelte';
	import IconlySettings from '$lib/components/icons/iconly/IconlySettings.svelte';
	import IconCoins from '$lib/components/icons/lucide/IconCoins.svelte';
	import IconImage from '$lib/components/icons/lucide/IconImage.svelte';
	import IconLineChart from '$lib/components/icons/lucide/IconLineChart.svelte';
	import IconNotebook from '$lib/components/icons/lucide/IconNotebook.svelte';
	import NavigationItem from '$lib/components/navigation/NavigationItem.svelte';
	import {
		DESKTOP_NAVIGATION_SECTIONS,
		MOBILE_NAVIGATION_BAR
	} from '$lib/constants/navigation.constants';
	import { AppPath } from '$lib/constants/routes.constants';
	import {
		NAVIGATION_GROUP_FINANCE,
		NAVIGATION_GROUP_MORE,
		NAVIGATION_GROUP_PORTFOLIO,
		NAVIGATION_ITEM_ACTIVITY,
		NAVIGATION_ITEM_BORROW,
		NAVIGATION_ITEM_EARN,
		NAVIGATION_ITEM_EXPLORER,
		NAVIGATION_ITEM_NFTS,
		NAVIGATION_ITEM_NOTES,
		NAVIGATION_ITEM_REWARDS,
		NAVIGATION_ITEM_SETTINGS,
		NAVIGATION_ITEM_TOKENS,
		NAVIGATION_ITEM_TRADE
	} from '$lib/constants/test-ids.constants';
	import { TokenTypes } from '$lib/enums/token-types';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { activeAssetsTabStore } from '$lib/stores/settings.store';
	import { userSelectedNetworkStore } from '$lib/stores/user-selected-network.store';
	import type {
		NavigationGroupId,
		NavigationItemDescriptor,
		NavigationItemId
	} from '$lib/types/navigation';
	import {
		isRouteActivity,
		isRouteDappExplorer,
		isRouteEarn,
		isRouteEarning,
		isRouteNfts,
		isRouteProvidersLiquidium,
		isRouteRewards,
		isRouteSettings,
		isRouteTokens,
		isRouteTrading,
		isRouteTransactions,
		networkUrl
	} from '$lib/utils/nav.utils';

	interface Props {
		testIdPrefix?: string;
		layout?: 'desktop' | 'mobile';
	}

	let { testIdPrefix, layout = 'desktop' }: Props = $props();

	const prefixedTestId = (testId: string): string =>
		nonNullish(testIdPrefix) ? `${testIdPrefix}-${testId}` : testId;

	const SECTION_META: Record<NavigationGroupId, { label: () => string; testId: string }> = {
		portfolio: {
			label: () => $i18n.navigation.text.section_portfolio,
			testId: NAVIGATION_GROUP_PORTFOLIO
		},
		finance: {
			label: () => $i18n.navigation.text.section_finance,
			testId: NAVIGATION_GROUP_FINANCE
		},
		more: { label: () => $i18n.navigation.text.section_more, testId: NAVIGATION_GROUP_MORE }
	};

	const notesModalId = Symbol();

	const isTransactionsRoute = $derived(isRouteTransactions(page));

	const networkId = $derived($userSelectedNetworkStore);

	let fromRoute = $state<NavigationTarget | null>(null);

	afterNavigate(({ from }) => {
		fromRoute = from;
	});

	const url = (path: AppPath): string =>
		networkUrl({ path, networkId, usePreviousRoute: isTransactionsRoute, fromRoute });

	// NFTs left the Assets tabs (it is now its own destination), so the Assets
	// link never resolves to the NFTs page — a persisted NFTS tab falls back to
	// the Tokens list.
	const assetsPath = $derived.by(() => {
		if ($activeAssetsTabStore === TokenTypes.EARNING) {
			return AppPath.Earning;
		}

		if ($activeAssetsTabStore === TokenTypes.TRADING) {
			return AppPath.Trading;
		}

		if ($activeAssetsTabStore === TokenTypes.TOKENS || $activeAssetsTabStore === TokenTypes.NFTS) {
			return AppPath.Tokens;
		}

		assertNever($activeAssetsTabStore, `Unexpected TokenTypes value: ${$activeAssetsTabStore}`);
	});

	const assetsSelected = $derived(
		isRouteTokens(page) || isRouteEarning(page) || isRouteTransactions(page)
	);

	// One descriptor per leaf item. A feature-flagged item resolves to no
	// descriptor when its flag is off, and is then skipped at render time.
	const descriptors = $derived.by<Partial<Record<NavigationItemId, NavigationItemDescriptor>>>(
		() => ({
			assets: {
				label: $i18n.navigation.text.tokens,
				ariaLabel: $i18n.navigation.alt.tokens,
				testId: prefixedTestId(NAVIGATION_ITEM_TOKENS),
				icon: IconWallet,
				href: url(assetsPath),
				selected: assetsSelected
			},
			nfts: {
				label: $i18n.navigation.text.nfts,
				ariaLabel: $i18n.navigation.alt.nfts,
				testId: prefixedTestId(NAVIGATION_ITEM_NFTS),
				icon: IconImage,
				href: url(AppPath.Nfts),
				selected: isRouteNfts(page)
			},
			activity: {
				label: $i18n.navigation.text.activity,
				ariaLabel: $i18n.navigation.alt.activity,
				testId: prefixedTestId(NAVIGATION_ITEM_ACTIVITY),
				icon: IconActivity,
				href: url(AppPath.Activity),
				selected: isRouteActivity(page)
			},
			// Trade and Borrow are NEW Finance destinations. Trade is gated behind
			// TRADING_ENABLED like the Assets Trading tab; Borrow routes to the
			// Liquidium provider page (no dedicated /borrow/ route exists yet).
			...(TRADING_ENABLED
				? {
						trade: {
							label: $i18n.navigation.text.trade,
							ariaLabel: $i18n.navigation.alt.trade,
							testId: prefixedTestId(NAVIGATION_ITEM_TRADE),
							icon: IconLineChart,
							href: url(AppPath.Trading),
							selected: isRouteTrading(page),
							tag: $i18n.core.text.new,
							tagVariant: 'emphasis'
						}
					}
				: {}),
			borrow: {
				label: $i18n.navigation.text.borrow,
				ariaLabel: $i18n.navigation.alt.borrow,
				testId: prefixedTestId(NAVIGATION_ITEM_BORROW),
				icon: IconCoins,
				href: url(AppPath.ProvidersLiquidium),
				selected: isRouteProvidersLiquidium(page),
				tag: $i18n.core.text.new,
				tagVariant: 'emphasis'
			},
			// Todo: remove condition once the Earn feature is permanently enabled.
			...(EARNING_ENABLED
				? {
						earn: {
							label: $i18n.navigation.text.earning,
							ariaLabel: $i18n.navigation.alt.earning,
							testId: prefixedTestId(NAVIGATION_ITEM_EARN),
							icon: IconPlant,
							href: url(AppPath.Earn),
							selected: isRouteEarn(page)
						}
					}
				: {}),
			explore: {
				label: $i18n.navigation.text.dapp_explorer,
				ariaLabel: $i18n.navigation.alt.dapp_explorer,
				testId: prefixedTestId(NAVIGATION_ITEM_EXPLORER),
				icon: AnimatedIconUfo,
				href: url(AppPath.Explore),
				selected: isRouteDappExplorer(page)
			},
			// Interim: opens the Notes modal (not a page yet), so it never takes the
			// blue "current page" treatment.
			notes: {
				label: $i18n.navigation.text.notes,
				ariaLabel: $i18n.navigation.alt.notes,
				testId: prefixedTestId(NAVIGATION_ITEM_NOTES),
				icon: IconNotebook,
				onclick: () => modalStore.openNotes(notesModalId),
				selected: false
			},
			settings: {
				label: $i18n.navigation.text.settings,
				ariaLabel: $i18n.navigation.alt.settings,
				testId: prefixedTestId(NAVIGATION_ITEM_SETTINGS),
				icon: IconlySettings,
				href: url(AppPath.Settings),
				selected: isRouteSettings(page)
			},
			rewards: {
				label: $i18n.navigation.text.airdrops,
				ariaLabel: $i18n.navigation.alt.airdrops,
				testId: prefixedTestId(NAVIGATION_ITEM_REWARDS),
				icon: IconGift,
				href: url(AppPath.Rewards),
				selected: isRouteRewards(page)
			}
		})
	);

	// Mobile interim layout (flat-but-grouped-aware): the bar slots are flattened
	// into a single list. The cradle + bottom sheets render in PR 3.
	const mobileItemIds = $derived<NavigationItemId[]>(
		MOBILE_NAVIGATION_BAR.flatMap((slot) => (slot.type === 'item' ? [slot.id] : slot.items))
	);
</script>

{#snippet navItem(id: NavigationItemId)}
	{@const descriptor = descriptors[id]}
	{#if nonNullish(descriptor)}
		{@const Icon = descriptor.icon}
		<NavigationItem
			ariaLabel={descriptor.ariaLabel}
			href={descriptor.href}
			onclick={descriptor.onclick}
			selected={descriptor.selected}
			tag={descriptor.tag}
			tagVariant={descriptor.tagVariant}
			testId={descriptor.testId}
		>
			{#snippet icon()}
				<Icon />
			{/snippet}
			{#snippet label()}
				{descriptor.label}
			{/snippet}
		</NavigationItem>
	{/if}
{/snippet}

{#if layout === 'desktop'}
	{#each DESKTOP_NAVIGATION_SECTIONS as section (section.id)}
		{@const items = section.items.filter((id) => nonNullish(descriptors[id]))}
		{#if items.length > 0}
			<p
				class="mt-2 px-3 text-[0.625rem] font-bold tracking-widest text-tertiary uppercase first:mt-0"
				data-tid={prefixedTestId(SECTION_META[section.id].testId)}
			>
				{SECTION_META[section.id].label()}
			</p>
			{#each items as id (id)}
				{@render navItem(id)}
			{/each}
		{/if}
	{/each}
{:else}
	{#each mobileItemIds as id (id)}
		{@render navItem(id)}
	{/each}
{/if}
