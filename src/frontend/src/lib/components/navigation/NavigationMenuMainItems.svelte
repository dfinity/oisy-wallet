<script lang="ts">
	import { assertNever, nonNullish } from '@dfinity/utils';
	import type { NavigationTarget } from '@sveltejs/kit';
	import type { Component } from 'svelte';
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
	import IconEllipsis from '$lib/components/icons/lucide/IconEllipsis.svelte';
	import IconImage from '$lib/components/icons/lucide/IconImage.svelte';
	import IconLayers from '$lib/components/icons/lucide/IconLayers.svelte';
	import IconLineChart from '$lib/components/icons/lucide/IconLineChart.svelte';
	import IconNotebook from '$lib/components/icons/lucide/IconNotebook.svelte';
	import NavigationGroupSheet from '$lib/components/navigation/NavigationGroupSheet.svelte';
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

	// Which group's bottom sheet is open on mobile (null = none).
	let openSheet = $state<NavigationGroupId | null>(null);

	const toggleSheet = (id: NavigationGroupId) => {
		openSheet = openSheet === id ? null : id;
	};

	const MOBILE_GROUP_ICON: Partial<Record<NavigationGroupId, Component>> = {
		finance: IconLayers,
		more: IconEllipsis
	};

	const isTransactionsRoute = $derived(isRouteTransactions(page));

	const networkId = $derived($userSelectedNetworkStore);

	let fromRoute = $state<NavigationTarget | null>(null);

	afterNavigate(({ from }) => {
		fromRoute = from;
		// Reaching any destination closes an open group sheet.
		openSheet = null;
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

	// A group "owns" the current page when one of its children is the active page;
	// that drives the cradle/More blue (owns) vs grey (open over another page).
	const groupOwnsCurrentPage = (items: NavigationItemId[]): boolean =>
		items.some((id) => descriptors[id]?.selected === true);
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

{#snippet navCard(id: NavigationItemId)}
	{@const descriptor = descriptors[id]}
	{#if nonNullish(descriptor)}
		{@const Icon = descriptor.icon}
		{@const cardClass = `flex flex-col items-center gap-2 rounded-2xl px-2 py-4 text-center ${descriptor.selected ? 'bg-brand-subtle-20 text-brand-primary-alt' : 'bg-secondary text-primary'}`}
		{#snippet cardInner()}
			<Icon />
			<span class="text-xs font-medium">{descriptor.label}</span>
		{/snippet}
		{#if nonNullish(descriptor.href)}
			<a
				class={cardClass}
				aria-label={descriptor.ariaLabel}
				data-tid={descriptor.testId}
				href={descriptor.href}
			>
				{@render cardInner()}
			</a>
		{:else}
			<button
				class={cardClass}
				aria-label={descriptor.ariaLabel}
				data-tid={descriptor.testId}
				onclick={descriptor.onclick}
				type="button"
			>
				{@render cardInner()}
			</button>
		{/if}
	{/if}
{/snippet}

{#if layout === 'desktop'}
	{#each DESKTOP_NAVIGATION_SECTIONS as section, sectionIndex (section.id)}
		{@const items = section.items.filter((id) => nonNullish(descriptors[id]))}
		{#if items.length > 0}
			<!-- Each group is its own box so the heading hugs its items (small gap);
			     the separation between groups (mt-3) is clearly larger. -->
			<div class="flex flex-col gap-0.5" class:mt-3={sectionIndex > 0}>
				<p
					class="mb-1 px-3 text-[0.625rem] font-bold tracking-widest text-tertiary uppercase"
					data-tid={prefixedTestId(SECTION_META[section.id].testId)}
				>
					{SECTION_META[section.id].label()}
				</p>
				{#each items as id (id)}
					{@render navItem(id)}
				{/each}
			</div>
		{/if}
	{/each}
{:else}
	{#each MOBILE_NAVIGATION_BAR as slot (slot.id)}
		{#if slot.type === 'item'}
			{@render navItem(slot.id)}
		{:else}
			{@const ownsCurrent = groupOwnsCurrentPage(slot.items)}
			{@const open = openSheet === slot.id}
			{@const pressed = open && !ownsCurrent}
			{@const GroupIcon = MOBILE_GROUP_ICON[slot.id]}
			{#if slot.id === 'finance'}
				<!-- Raised center cradle: a white circle with a thin ring + icon in the
				     current text colour — black by default, blue when it owns the current
				     page, grey while its sheet is open over another page. The label
				     matches the other bar items (text-sm). All three colour classes are applied
					     conditionally (text-primary is NOT a base class) so the active one wins
					     regardless of Tailwind's utility source order. -->
				<button
					class="flex min-w-0 flex-1 flex-col items-center justify-end p-1.5 text-center text-sm"
					class:text-brand-primary-alt={ownsCurrent}
					class:text-primary={!ownsCurrent && !pressed}
					class:text-tertiary={pressed}
					aria-expanded={open}
					aria-label={SECTION_META[slot.id].label()}
					data-tid={prefixedTestId(SECTION_META[slot.id].testId)}
					onclick={() => toggleSheet(slot.id)}
					type="button"
				>
					<!-- Circle embedded in the bar's hump (bottom:28px, matching the
					     design). Anchored to the bar (the button is not positioned, so this
					     centers on the whole bar at 50% — the same reference as the hump SVG
					     — not just this slot). The safe-area inset lifts it in step with the
					     row (which the global `.mobile-nav` container padding lifts) so it clears the indicator.
					     The label stays on the row (items-end). -->
					<span
						class="absolute bottom-[calc(1.75rem+env(safe-area-inset-bottom))] left-1/2 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border-[1.5px] border-current bg-primary transition-colors"
					>
						{#if nonNullish(GroupIcon)}
							<GroupIcon />
						{/if}
					</span>
					{SECTION_META[slot.id].label()}
				</button>
			{:else}
				<button
					class="nav-item flex min-w-0 flex-1"
					class:bg-disabled={pressed}
					class:selected={ownsCurrent}
					aria-expanded={open}
					aria-label={SECTION_META[slot.id].label()}
					data-tid={prefixedTestId(SECTION_META[slot.id].testId)}
					onclick={() => toggleSheet(slot.id)}
					type="button"
				>
					{#if nonNullish(GroupIcon)}
						<GroupIcon />
					{/if}
					<span class="block w-full truncate md:w-auto">{SECTION_META[slot.id].label()}</span>
				</button>
			{/if}
		{/if}
	{/each}

	{#each MOBILE_NAVIGATION_BAR as slot (slot.id)}
		{#if slot.type === 'group'}
			<NavigationGroupSheet
				label={SECTION_META[slot.id].label()}
				onClose={() => (openSheet = null)}
				testId={prefixedTestId(`${SECTION_META[slot.id].testId}-sheet`)}
				visible={openSheet === slot.id}
			>
				{#each slot.items.filter((id) => nonNullish(descriptors[id])) as id (id)}
					{@render navCard(id)}
				{/each}
			</NavigationGroupSheet>
		{/if}
	{/each}
{/if}
