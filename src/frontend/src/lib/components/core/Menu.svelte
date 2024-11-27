<script lang="ts">
	import { IconUser, Popover } from '@dfinity/gix-components';
	import type { NavigationTarget } from '@sveltejs/kit';
	import { afterNavigate, goto } from '$app/navigation';
	import { page } from '$app/stores';
	import AboutWhyOisy from '$lib/components/about/AboutWhyOisy.svelte';
	import MenuAddresses from '$lib/components/core/MenuAddresses.svelte';
	import SignOut from '$lib/components/core/SignOut.svelte';
	import IconGitHub from '$lib/components/icons/IconGitHub.svelte';
	import IconWallet from '$lib/components/icons/IconWallet.svelte';
	import IconActivity from '$lib/components/icons/iconly/IconActivity.svelte';
	import IconlySettings from '$lib/components/icons/iconly/IconlySettings.svelte';
	import IconlyUfo from '$lib/components/icons/iconly/IconlyUfo.svelte';
	import LicenseLink from '$lib/components/license-agreement/LicenseLink.svelte';
	import ChangelogLink from '$lib/components/navigation/ChangelogLink.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import ButtonMenu from '$lib/components/ui/ButtonMenu.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { OISY_REPO_URL } from '$lib/constants/oisy.constants';
	import { AppPath } from '$lib/constants/routes.constants';
	import { NAVIGATION_MENU_BUTTON, NAVIGATION_MENU } from '$lib/constants/test-ids.constants';
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

	let visible = false;
	let button: HTMLButtonElement | undefined;

	let fromRoute: NavigationTarget | null;

	afterNavigate(({ from }) => {
		fromRoute = from;
	});

	let isTransactionsRoute = false;
	$: isTransactionsRoute = isRouteTransactions($page);

	const hidePopover = () => (visible = false);

	const navigateTo = async (path: AppPath) => {
		hidePopover();
		await goto(networkUrl({ path, networkId: $networkId, isTransactionsRoute, fromRoute }));
	};

	const goToTokens = async () => await navigateTo(AppPath.Tokens);

	const gotoSettings = async () => await navigateTo(AppPath.Settings);

	const goToDappExplorer = async () => await navigateTo(AppPath.Explore);

	const goToActivity = async () => await navigateTo(AppPath.Activity);

	let assetsRoute = false;
	$: assetsRoute = isRouteTokens($page);

	let settingsRoute = false;
	$: settingsRoute = isRouteSettings($page);

	let dAppExplorerRoute = false;
	$: dAppExplorerRoute = isRouteDappExplorer($page);

	let activityRoute = false;
	$: activityRoute = isRouteActivity($page);

	let addressesOption = true;
	$: addressesOption = !settingsRoute && !dAppExplorerRoute && !activityRoute;
</script>

<ButtonIcon
	bind:button
	on:click={() => (visible = true)}
	ariaLabel={$i18n.navigation.alt.menu}
	testId={NAVIGATION_MENU_BUTTON}
>
	<IconUser size="24" slot="icon" />
	{$i18n.navigation.alt.menu}
</ButtonIcon>

<Popover bind:visible anchor={button} direction="rtl">
	<div class="flex flex-col gap-4" data-tid={NAVIGATION_MENU}>
		{#if addressesOption}
			<MenuAddresses on:icMenuClick={hidePopover} />
		{/if}

		{#if !assetsRoute && !settingsRoute}
			<ButtonMenu ariaLabel={$i18n.navigation.alt.tokens} on:click={goToTokens}>
				<IconWallet size="20" />
				{$i18n.navigation.text.tokens}
			</ButtonMenu>
		{/if}

		{#if !activityRoute && !settingsRoute}
			<ButtonMenu ariaLabel={$i18n.navigation.alt.activity} on:click={goToActivity}>
				<IconActivity size="20" />
				{$i18n.navigation.text.activity}
			</ButtonMenu>
		{/if}

		{#if !dAppExplorerRoute && !settingsRoute}
			<ButtonMenu ariaLabel={$i18n.navigation.alt.dapp_explorer} on:click={goToDappExplorer}>
				<IconlyUfo size="20" />
				{$i18n.navigation.text.dapp_explorer}
			</ButtonMenu>
		{/if}

		{#if !settingsRoute}
			<ButtonMenu ariaLabel={$i18n.navigation.alt.more_settings} on:click={gotoSettings}>
				<IconlySettings size="20" />
				{$i18n.settings.text.title}
			</ButtonMenu>

			<Hr />
		{/if}

		<AboutWhyOisy asMenuItem on:icOpenAboutModal={hidePopover} />

		<ChangelogLink />

		<ExternalLink
			href="https://github.com/dfinity/oisy-wallet/issues"
			ariaLabel={$i18n.navigation.alt.submit_ticket}
		>
			{$i18n.navigation.text.submit_ticket}
		</ExternalLink>

		<Hr />

		<a
			href={OISY_REPO_URL}
			rel="external noopener noreferrer"
			target="_blank"
			class="flex items-center gap-2 no-underline"
			aria-label={$i18n.navigation.text.source_code_on_github}
		>
			<IconGitHub />
			{$i18n.navigation.text.source_code}
		</a>

		<Hr />

		<SignOut on:icLogoutTriggered={hidePopover} />

		<Hr />

		<span class="text-center text-sm text-tertiary">
			<LicenseLink noUnderline />
		</span>
	</div>
</Popover>
