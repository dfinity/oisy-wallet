<script lang="ts">
	import { IconUser, Popover } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { NavigationTarget } from '@sveltejs/kit';
	import { onMount } from 'svelte';
	import { afterNavigate, goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { AIRDROPS_ENABLED } from '$env/airdrops.env';
	import AboutWhyOisy from '$lib/components/about/AboutWhyOisy.svelte';
	import MenuAddresses from '$lib/components/core/MenuAddresses.svelte';
	import SignOut from '$lib/components/core/SignOut.svelte';
	import IconGift from '$lib/components/icons/IconGift.svelte';
	import IconGitHub from '$lib/components/icons/IconGitHub.svelte';
	import IconHelp from '$lib/components/icons/IconHelp.svelte';
	import IconVipQr from '$lib/components/icons/IconVipQr.svelte';
	import IconWallet from '$lib/components/icons/IconWallet.svelte';
	import IconActivity from '$lib/components/icons/iconly/IconActivity.svelte';
	import IconlySettings from '$lib/components/icons/iconly/IconlySettings.svelte';
	import IconlyUfo from '$lib/components/icons/iconly/IconlyUfo.svelte';
	import LicenseLink from '$lib/components/license-agreement/LicenseLink.svelte';
	import ChangelogLink from '$lib/components/navigation/ChangelogLink.svelte';
	import VipQrCodeModal from '$lib/components/qr/VipQrCodeModal.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import ButtonMenu from '$lib/components/ui/ButtonMenu.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { OISY_REPO_URL } from '$lib/constants/oisy.constants';
	import { AppPath } from '$lib/constants/routes.constants';
	import {
		NAVIGATION_MENU_BUTTON,
		NAVIGATION_MENU,
		NAVIGATION_ITEM_ACTIVITY,
		NAVIGATION_ITEM_EXPLORER,
		NAVIGATION_ITEM_SETTINGS,
		NAVIGATION_MENU_VIP_BUTTON,
		NAVIGATION_ITEM_AIRDROPS
	} from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { modalVipQrCode } from '$lib/derived/modal.derived';
	import { networkId } from '$lib/derived/network.derived';
	import { isVipUser } from '$lib/services/reward-code.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import {
		isRouteActivity,
		isRouteAirdrops,
		isRouteDappExplorer,
		isRouteSettings,
		isRouteTokens,
		isRouteTransactions,
		networkUrl
	} from '$lib/utils/nav.utils';

	let visible = false;
	let button: HTMLButtonElement | undefined;

	let fromRoute: NavigationTarget | null;

	let isVip = false;
	onMount(async () => {
		if (nonNullish($authIdentity)) {
			isVip = (
				await isVipUser({
					identity: $authIdentity
				})
			).success;
		}
	});

	afterNavigate(({ from }) => {
		fromRoute = from;
	});

	let isTransactionsRoute = false;
	$: isTransactionsRoute = isRouteTransactions($page);

	const hidePopover = () => (visible = false);

	const navigateTo = async (path: AppPath) => {
		hidePopover();
		await goto(
			networkUrl({ path, networkId: $networkId, usePreviousRoute: isTransactionsRoute, fromRoute })
		);
	};

	const goToTokens = async () => await navigateTo(AppPath.Tokens);

	const gotoSettings = async () => await navigateTo(AppPath.Settings);

	const goToDappExplorer = async () => await navigateTo(AppPath.Explore);

	const goToActivity = async () => await navigateTo(AppPath.Activity);

	const goToAirdrops = async () => await navigateTo(AppPath.Airdrops);

	let assetsRoute = false;
	$: assetsRoute = isRouteTokens($page);

	let settingsRoute = false;
	$: settingsRoute = isRouteSettings($page);

	let dAppExplorerRoute = false;
	$: dAppExplorerRoute = isRouteDappExplorer($page);

	let activityRoute = false;
	$: activityRoute = isRouteActivity($page);

	let airdropsRoute = false;
	$: airdropsRoute = isRouteAirdrops($page);

	let addressesOption = true;
	$: addressesOption = !settingsRoute && !dAppExplorerRoute && !activityRoute && !airdropsRoute;
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
	<div class="flex flex-col gap-1" data-tid={NAVIGATION_MENU}>
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
			<ButtonMenu
				testId={NAVIGATION_ITEM_ACTIVITY}
				ariaLabel={$i18n.navigation.alt.activity}
				on:click={goToActivity}
			>
				<IconActivity size="20" />
				{$i18n.navigation.text.activity}
			</ButtonMenu>
		{/if}

		{#if !dAppExplorerRoute && !settingsRoute}
			<ButtonMenu
				testId={NAVIGATION_ITEM_EXPLORER}
				ariaLabel={$i18n.navigation.alt.dapp_explorer}
				on:click={goToDappExplorer}
			>
				<IconlyUfo size="20" />
				{$i18n.navigation.text.dapp_explorer}
			</ButtonMenu>
		{/if}

		{#if AIRDROPS_ENABLED && !airdropsRoute && !settingsRoute}
			<ButtonMenu
				testId={NAVIGATION_ITEM_AIRDROPS}
				ariaLabel={$i18n.navigation.alt.airdrops}
				on:click={goToAirdrops}
			>
				<IconGift size="20" />
				{$i18n.navigation.text.airdrops}
			</ButtonMenu>
		{/if}

		{#if !settingsRoute}
			<ButtonMenu
				testId={NAVIGATION_ITEM_SETTINGS}
				ariaLabel={$i18n.navigation.alt.more_settings}
				on:click={gotoSettings}
			>
				<IconlySettings size="20" />
				{$i18n.settings.text.title}
			</ButtonMenu>

			<Hr />
		{/if}

		{#if isVip}
			<ButtonMenu
				ariaLabel={$i18n.navigation.alt.vip_qr_code}
				testId={NAVIGATION_MENU_VIP_BUTTON}
				on:click={modalStore.openVipQrCode}
			>
				<IconVipQr size="20" />
				{$i18n.navigation.text.vip_qr_code}
			</ButtonMenu>
		{/if}

		<AboutWhyOisy asMenuItem asMenuItemCondensed on:icOpenAboutModal={hidePopover} />

		<ChangelogLink asMenuItem asMenuItemCondensed />

		<ExternalLink
			asMenuItem
			asMenuItemCondensed
			href="mailto:support@oisy.com"
			ariaLabel={$i18n.navigation.alt.support_email}
			iconVisible={false}
		>
			<IconHelp />
			{$i18n.navigation.text.support_email}
		</ExternalLink>

		<Hr />

		<a
			href={OISY_REPO_URL}
			rel="external noopener noreferrer"
			target="_blank"
			class="nav-item nav-item-condensed"
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

{#if $modalVipQrCode}
	<VipQrCodeModal />
{/if}
