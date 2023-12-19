<script lang="ts">
	import IconIcLogo from '$lib/components/icons/IconIcLogo.svelte';
	import { IconGitHub, IconNorthEast, IconSettings, Popover } from '@dfinity/gix-components';
	import SignOut from '$lib/components/core/SignOut.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { goto } from '$app/navigation';
	import { OISY_REPO_URL } from '$lib/constants/oisy.constants';
	import IconWallet from '$lib/components/icons/IconWallet.svelte';
	import IconChevronDown from '$lib/components/icons/IconChevronDown.svelte';
	import { address } from '$lib/derived/address.derived';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';

	let visible = false;
	let button: HTMLButtonElement | undefined;

	const gotoSettings = async () => {
		visible = false;
		await goto('/settings');
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
		<div>
			<output class="break-all">{shortenWithMiddleEllipsis($address ?? '')}</output><Copy
				inline
				value={$address ?? ''}
				text="Address copied to clipboard."
			/>
		</div>

		<Hr />

		<a
			href={OISY_REPO_URL}
			rel="external noopener noreferrer"
			target="_blank"
			class="flex gap-2 items-center no-underline"
			aria-label="Source code on GitHub"
		>
			<IconGitHub /> Source code <IconNorthEast size="12" />
		</a>

		<Hr />

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
