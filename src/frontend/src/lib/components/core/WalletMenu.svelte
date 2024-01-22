<script lang="ts">
	import { IconGitHub, IconSettings, Popover } from '@dfinity/gix-components';
	import SignOut from '$lib/components/core/SignOut.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { goto } from '$app/navigation';
	import { OISY_REPO_URL } from '$lib/constants/oisy.constants';
	import IconWallet from '$lib/components/icons/IconWallet.svelte';
	import IconChevronDown from '$lib/components/icons/IconChevronDown.svelte';
	import IconExternalLink from '$lib/components/icons/IconExternalLink.svelte';
	import { networkICP, networkId } from '$lib/derived/network.derived';
	import { networkParam } from '$lib/utils/nav.utils';
	import EthWalletAddress from '$eth/components/core/EthWalletAddress.svelte';
	import IcWalletAddress from '$icp/components/core/IcWalletAddress.svelte';

	let visible = false;
	let button: HTMLButtonElement | undefined;

	const gotoSettings = async () => {
		visible = false;
		await goto(`/settings?${networkParam($networkId)}`);
	};
</script>

<button
	class="user icon desktop-wide"
	bind:this={button}
	on:click={() => (visible = true)}
	aria-label="Settings, sign-out and external links"
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
			aria-label="Source code on GitHub"
		>
			<IconGitHub /> Source code
		</a>

		<Hr />

		<a
			href="https://identity.ic0.app"
			rel="external noopener noreferrer"
			target="_blank"
			class="flex gap-2 items-center no-underline"
			aria-label="Administrate your Internet Identity"
		>
			<span class="ml-1"><IconExternalLink /></span>
			Manage Internet Identity
		</a>

		<button
			class="flex gap-2 items-center no-underline hover:text-blue active:text-blue"
			aria-label="More settings"
			on:click={gotoSettings}
		>
			<IconSettings /> Settings
		</button>

		<SignOut on:icLogoutTriggered={() => (visible = false)} />
	</div>
</Popover>
