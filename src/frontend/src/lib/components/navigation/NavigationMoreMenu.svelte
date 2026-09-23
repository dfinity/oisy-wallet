<script lang="ts">
	import type { Component } from 'svelte';
	import type { Action } from 'svelte/action';
	import IconBook from '$lib/components/icons/IconBook.svelte';
	import IconGixGitHub from '$lib/components/icons/IconGixGitHub.svelte';
	import IconList from '$lib/components/icons/IconList.svelte';
	import IconTwitter from '$lib/components/icons/IconTwitter.svelte';
	import IconEllipsis from '$lib/components/icons/lucide/IconEllipsis.svelte';
	import IconHelp from '$lib/components/icons/lucide/IconHelp.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import Popover from '$lib/components/ui/Popover.svelte';
	import {
		MORE_MENU_ROUTE,
		TRACK_COUNT_OPEN_DOCUMENTATION
	} from '$lib/constants/analytics.constants';
	import {
		OISY_DOCS_URL,
		OISY_FAQ_URL,
		OISY_REPO_URL,
		OISY_SUPPORT_URL,
		OISY_TWITTER_URL
	} from '$lib/constants/oisy.constants';
	import {
		NAVIGATION_MORE_MENU,
		NAVIGATION_MORE_MENU_BUTTON,
		NAVIGATION_MORE_MENU_DOCUMENTATION,
		NAVIGATION_MORE_MENU_FAQ,
		NAVIGATION_MORE_MENU_HELP,
		NAVIGATION_MORE_MENU_SOURCE_CODE,
		NAVIGATION_MORE_MENU_X
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { TrackEventParams } from '$lib/types/analytics';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	interface MoreMenuRow {
		label: string;
		ariaLabel: string;
		href: string;
		icon: Component;
		testId: string;
		trackEvent?: TrackEventParams;
	}

	let visible = $state(false);
	let button = $state<HTMLButtonElement | undefined>();

	const close = () => (visible = false);

	// The rows, in the order they appear, split where the divider goes: the places
	// to get help first, then the links that leave for somewhere else entirely.
	//
	// Help points at the support page in the documentation until the in-app Help
	// page (#14019) lands. That PR's edit is this row's `href`, to `/help/`, and
	// nothing else — the row, its position and its label are already right.
	const groups = $derived<MoreMenuRow[][]>([
		[
			{
				label: $i18n.navigation.text.help,
				ariaLabel: replaceOisyPlaceholders($i18n.navigation.alt.support),
				href: OISY_SUPPORT_URL,
				icon: IconHelp,
				testId: NAVIGATION_MORE_MENU_HELP
			},
			{
				label: replaceOisyPlaceholders($i18n.navigation.text.documentation),
				ariaLabel: replaceOisyPlaceholders($i18n.navigation.alt.documentation),
				href: OISY_DOCS_URL,
				icon: IconBook,
				testId: NAVIGATION_MORE_MENU_DOCUMENTATION,
				// The one row the account menu already counts, so it is counted here
				// too — under its own source, so the two entry points can be compared.
				trackEvent: { name: TRACK_COUNT_OPEN_DOCUMENTATION, metadata: { source: MORE_MENU_ROUTE } }
			},
			{
				label: $i18n.navigation.text.faq,
				ariaLabel: replaceOisyPlaceholders($i18n.navigation.alt.faq),
				href: OISY_FAQ_URL,
				// A list rather than a second question mark: one row up is Help, and two
				// near-identical icons in a row read as a duplicate entry.
				icon: IconList,
				testId: NAVIGATION_MORE_MENU_FAQ
			}
		],
		[
			{
				label: $i18n.navigation.text.source_code,
				ariaLabel: $i18n.navigation.text.source_code_on_github,
				href: OISY_REPO_URL,
				icon: IconGixGitHub,
				testId: NAVIGATION_MORE_MENU_SOURCE_CODE
			},
			{
				label: $i18n.navigation.text.x,
				ariaLabel: replaceOisyPlaceholders($i18n.navigation.alt.open_twitter),
				href: OISY_TWITTER_URL,
				icon: IconTwitter,
				testId: NAVIGATION_MORE_MENU_X
			}
		]
	]);

	// Moves the menu to the end of <body>. The footer that holds the trigger is
	// `md:fixed` with `z-1`, which makes it a stacking context: rendered inside it,
	// the popover's overlay z-index only competes with the footer's own children,
	// and against the rest of the page the whole overlay sits at z-1. The header,
	// the tabs bar and the AI assistant button (`z-2`) drew on top of the backdrop.
	// At the end of <body> the overlay stacks against the document instead, which
	// is where the account menu's popover already sits.
	//
	// Here rather than in `Popover`: every other popover is anchored somewhere
	// that is not a low stacking context, and moving all of them would change
	// where each one sits in the document for no reason of its own.
	const portal: Action<HTMLDivElement> = (node) => {
		document.body.appendChild(node);

		return { destroy: () => node.remove() };
	};

	// `Popover` has no key handling of its own — its backdrop answers Enter and
	// Space, not Escape — so a menu that is expected to close on Escape does it
	// here. Scoped to this menu on purpose: teaching every popover in the app the
	// key would change the account menu and every dropdown along with it.
	const onKeydown = ({ key }: KeyboardEvent) => {
		if (visible && key === 'Escape') {
			close();
		}
	};
</script>

<svelte:window onkeydown={onKeydown} />

<!--
	A plain button with the `nav-item` class rather than a `NavigationItem`, for
	the same reason the mobile More group is one: it opens something rather than
	going somewhere, so it needs `aria-expanded` and an element the popover can
	anchor to, and `NavigationItem` offers neither.
-->
<button
	bind:this={button}
	class="nav-item flex min-w-0 flex-1"
	aria-expanded={visible}
	aria-haspopup="menu"
	aria-label={replaceOisyPlaceholders($i18n.navigation.alt.more)}
	data-tid={NAVIGATION_MORE_MENU_BUTTON}
	onclick={() => (visible = !visible)}
	type="button"
>
	<IconEllipsis />
	<span class="block w-full truncate md:w-auto">{$i18n.navigation.text.section_more}</span>
</button>

<!-- Opens upward: the footer is pinned to the bottom of the viewport, so a panel
     opened the usual way would have nowhere to go. -->
<div use:portal>
	<Popover anchor={button} placement="above" bind:visible>
		<div
			class="flex max-w-80 flex-col gap-1"
			data-tid={NAVIGATION_MORE_MENU}
			onclick={close}
			role="none"
		>
			{#each groups as rows, groupIndex (groupIndex)}
				{#if groupIndex > 0}
					<Hr />
				{/if}

				{#each rows as { label, ariaLabel, href, icon: Icon, testId, trackEvent } (testId)}
					<ExternalLink
						{ariaLabel}
						asMenuItem
						asMenuItemCondensed
						{href}
						iconVisible={false}
						{testId}
						{trackEvent}
					>
						<Icon />
						{label}
					</ExternalLink>
				{/each}
			{/each}
		</div>
	</Popover>
</div>
