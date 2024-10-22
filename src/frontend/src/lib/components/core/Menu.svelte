<script lang="ts">
	import { IconUser, Popover } from '@dfinity/gix-components';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import MenuWallet from '$lib/components/core/MenuWallet.svelte';
	import SignOut from '$lib/components/core/SignOut.svelte';
	import AboutHow from '$lib/components/hero/about/AboutHow.svelte';
	import AboutWhat from '$lib/components/hero/about/AboutWhat.svelte';
	import IconGitHub from '$lib/components/icons/IconGitHub.svelte';
	import IconlySettings from '$lib/components/icons/iconly/IconlySettings.svelte';
	import IconlyUfo from '$lib/components/icons/iconly/IconlyUfo.svelte';
	import ChangelogLink from '$lib/components/navigation/ChangelogLink.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import ButtonMenu from '$lib/components/ui/ButtonMenu.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { OISY_REPO_URL } from '$lib/constants/oisy.constants';
	import { NAVIGATION_MENU_BUTTON, NAVIGATION_MENU } from '$lib/constants/test-ids.constants';
	import { networkId } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { isRouteDappExplorer, isRouteSettings, networkParam } from '$lib/utils/nav.utils';

	let visible = false;
	let button: HTMLButtonElement | undefined;

	const hidePopover = () => (visible = false);

	const gotoSettings = async () => {
		hidePopover();
		await goto(`/settings?${networkParam($networkId)}`);
	};
	const goToDappExplorer = async () => {
		hidePopover();
		await goto(`/explore`);
	};

	let settingsRoute = false;
	$: settingsRoute = isRouteSettings($page);

	let dAppExplorerRoute = false;
	$: dAppExplorerRoute = isRouteDappExplorer($page);

	let walletOptions = true;
	$: walletOptions = !settingsRoute;
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
		{#if walletOptions}
			<MenuWallet on:icMenuClick={hidePopover} />
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

		<AboutHow asMenuItem on:icOpenAboutModal={hidePopover} />
		<AboutWhat asMenuItem on:icOpenAboutModal={hidePopover} />

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
	</div>
</Popover>
