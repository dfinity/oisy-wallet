<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import MenuWallet from '$lib/components/core/MenuWallet.svelte';
	import SignOut from '$lib/components/core/SignOut.svelte';
	import AboutHow from '$lib/components/hero/about/AboutHow.svelte';
	import AboutWhat from '$lib/components/hero/about/AboutWhat.svelte';
	import IconGitHub from '$lib/components/icons/IconGitHub.svelte';
	import IconSettings from '$lib/components/icons/IconSettings.svelte';
	import IconUser from '$lib/components/icons/IconUser.svelte';
	import ButtonHero from '$lib/components/ui/ButtonHero.svelte';
	import ButtonMenu from '$lib/components/ui/ButtonMenu.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { OISY_REPO_URL } from '$lib/constants/oisy.constants';
	import { NAVIGATION_MENU_BUTTON, NAVIGATION_MENU } from '$lib/constants/test-ids.constants';
	import { networkId } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import { isRouteSettings, networkParam } from '$lib/utils/nav.utils';

	let visible = false;
	let button: HTMLButtonElement | undefined;

	const hidePopover = () => (visible = false);

	const gotoSettings = async () => {
		hidePopover();
		await goto(`/settings?${networkParam($networkId)}`);
	};

	let settingsRoute = false;
	$: settingsRoute = isRouteSettings($page);

	let walletOptions = true;
	$: walletOptions = !settingsRoute;
</script>

<ButtonHero
	bind:button
	on:click={() => (visible = true)}
	ariaLabel={$i18n.navigation.alt.menu}
	testId={NAVIGATION_MENU_BUTTON}
>
	<IconUser slot="icon" />
</ButtonHero>

<Popover bind:visible anchor={button} direction="rtl">
	<div class="flex flex-col gap-4" data-tid={NAVIGATION_MENU}>
		{#if walletOptions}
			<MenuWallet on:icMenuClick={hidePopover} />
		{/if}

		{#if !settingsRoute}
			<ButtonMenu ariaLabel={$i18n.navigation.alt.more_settings} on:click={gotoSettings}>
				<IconSettings />
				{$i18n.settings.text.title}
			</ButtonMenu>

			<Hr />
		{/if}

		<AboutWhat asMenuItem on:icOpenAboutModal={hidePopover} />
		<AboutHow asMenuItem on:icOpenAboutModal={hidePopover} />

		<ExternalLink
			href="https://github.com/orgs/dfinity/projects/33"
			ariaLabel={replaceOisyPlaceholders($i18n.navigation.alt.oisy_roadmap)}
		>
			{replaceOisyPlaceholders($i18n.navigation.text.oisy_roadmap)}
		</ExternalLink>

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
