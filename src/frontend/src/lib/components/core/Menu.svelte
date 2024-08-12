<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import SignOut from '$lib/components/core/SignOut.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { OISY_REPO_URL } from '$lib/constants/oisy.constants';
	import IconUser from '$lib/components/icons/IconUser.svelte';
	import { networkId } from '$lib/derived/network.derived';
	import { isRouteSettings, networkParam } from '$lib/utils/nav.utils';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import IconSettings from '$lib/components/icons/IconSettings.svelte';
	import IconGitHub from '$lib/components/icons/IconGitHub.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import ButtonHero from '$lib/components/ui/ButtonHero.svelte';
	import MenuWallet from '$lib/components/core/MenuWallet.svelte';
	import { page } from '$app/stores';
	import AboutHow from '$lib/components/hero/about/AboutHow.svelte';
	import AboutWhat from '$lib/components/hero/about/AboutWhat.svelte';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils.js';
	import Link from '$lib/components/ui/Link.svelte';

	let visible = false;
	let button: HTMLButtonElement | undefined;

	const hidePopover = () => (visible = false);

	let settingsUrl: string;
	$: settingsUrl = `/settings?${networkParam($networkId)}`;

	let settingsRoute = false;
	$: settingsRoute = isRouteSettings($page);

	let walletOptions = true;
	$: walletOptions = !settingsRoute;
</script>

<ButtonHero bind:button on:click={() => (visible = true)} ariaLabel={$i18n.navigation.alt.menu}>
	<IconUser slot="icon" />
</ButtonHero>

<Popover bind:visible anchor={button} direction="rtl">
	<div class="flex flex-col gap-4">
		{#if walletOptions}
			<MenuWallet on:icMenuClick={hidePopover} />
		{/if}

		{#if !settingsRoute}
			<Link
				href={settingsUrl}
				ariaLabel={$i18n.navigation.alt.more_settings}
				on:icBeforeNavigate={hidePopover}
			>
				<IconSettings slot="icon" />
				{$i18n.settings.text.title}
			</Link>

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

		<Link href={OISY_REPO_URL} ariaLabel={$i18n.navigation.text.source_code_on_github} external>
			<IconGitHub slot="icon" />
			{$i18n.navigation.text.source_code}
		</Link>

		<Hr />

		<SignOut on:icLogoutTriggered={hidePopover} />
	</div>
</Popover>
