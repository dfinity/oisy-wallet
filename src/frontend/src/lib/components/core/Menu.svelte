<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import SignOut from '$lib/components/core/SignOut.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { goto } from '$app/navigation';
	import { OISY_REPO_URL } from '$lib/constants/oisy.constants';
	import IconWallet from '$lib/components/icons/IconWallet.svelte';
	import IconChevronDown from '$lib/components/icons/IconChevronDown.svelte';
	import { networkICP, networkId } from '$lib/derived/network.derived';
	import { networkParam } from '$lib/utils/nav.utils';
	import EthWalletAddress from '$eth/components/core/EthWalletAddress.svelte';
	import IcWalletAddress from '$icp/components/core/IcWalletAddress.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import IconSettings from '$lib/components/icons/IconSettings.svelte';
	import IconGitHub from '$lib/components/icons/IconGitHub.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { isNetworkIdChainFusion } from '$lib/utils/network.utils';

	let visible = false;
	let button: HTMLButtonElement | undefined;

	const gotoSettings = async () => {
		visible = false;
		await goto(
			`/settings${isNetworkIdChainFusion($networkId) ? '' : `?${networkParam($networkId)}`}`
		);
	};
</script>

<button
	class="user icon desktop-wide"
	bind:this={button}
	on:click={() => (visible = true)}
	aria-label={$i18n.navigation.alt.menu}
>
	<IconWallet /><span><IconChevronDown /></span>
</button>

<Popover bind:visible anchor={button} direction="rtl">
	<div class="flex flex-col gap-4">
		{#if $networkICP}
			<IcWalletAddress />
		{:else}
			<EthWalletAddress />
		{/if}

		<Hr />

		<a
			href={OISY_REPO_URL}
			rel="external noopener noreferrer"
			target="_blank"
			class="flex gap-2 items-center no-underline"
			aria-label={$i18n.navigation.text.source_code_on_github}
		>
			<IconGitHub />
			{$i18n.navigation.text.source_code}
		</a>

		<Hr />

		<ExternalLink
			href="https://identity.ic0.app"
			ariaLabel={$i18n.navigation.alt.manage_internet_identity}
		>
			{$i18n.navigation.text.manage_internet_identity}
		</ExternalLink>

		<button
			class="flex gap-2 items-center no-underline hover:text-blue active:text-blue"
			aria-label={$i18n.navigation.alt.more_settings}
			on:click={gotoSettings}
		>
			<IconSettings />
			{$i18n.settings.text.title}
		</button>

		<SignOut on:icLogoutTriggered={() => (visible = false)} />
	</div>
</Popover>
