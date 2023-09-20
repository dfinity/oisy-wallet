<script lang="ts">
	import IconIcLogo from '$lib/components/icons/IconIcLogo.svelte';
	import { IconGitHub, IconNorthEast, IconSettings, Popover } from '@dfinity/gix-components';
	import SignOut from '$lib/components/core/SignOut.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { goto } from '$app/navigation';

	let visible = false;
	let button: HTMLButtonElement | undefined;

	const gotoSettings = async () => {
		visible = false;
		await goto('/settings');
	};
</script>

<button
	class="user icon"
	bind:this={button}
	on:click={() => (visible = true)}
	aria-label="Settings, sign-out and external links"
>
	<IconIcLogo />
</button>

<Popover bind:visible anchor={button} direction="rtl">
	<div class="flex flex-col gap-1">
		<a
			href="https://internetcomputer.org"
			rel="external noopener noreferrer"
			target="_blank"
			class="flex gap-1 items-center no-underline"
			aria-label="Open the Internet Computer portal"
		>
			<div
				class="flex items-center justify-center rounded-50"
				style="border: 1px solid var(--color-grey); zoom: 0.6;"
			>
				<IconIcLogo />
			</div>
			Internet Computer <IconNorthEast size="12" />
		</a>

		<a
			href="https://github.com/dfinity/ic-eth-wallet"
			rel="external noopener noreferrer"
			target="_blank"
			class="flex gap-1 items-center no-underline"
			aria-label="Source code on GitHub"
		>
			<IconGitHub /> Source code <IconNorthEast size="12" />
		</a>

		<Hr />

		<button
			class="flex gap-1 items-center no-underline"
			aria-label="More settings"
			on:click={gotoSettings}
		>
			<IconSettings /> Settings
		</button>

		<SignOut on:icLogoutTriggered={() => (visible = false)} />
	</div>
</Popover>
