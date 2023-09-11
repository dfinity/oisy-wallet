<script lang="ts">
	import IconIcLogo from '$lib/components/icons/IconIcLogo.svelte';
	import { authStore } from '$lib/stores/auth.store';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { IconGitHub, Popover } from '@dfinity/gix-components';
	import SignOut from '$lib/components/core/SignOut.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';

	let visible = false;
	let button: HTMLButtonElement | undefined;
</script>

<button
	class="primary icon"
	bind:this={button}
	on:click={() => (visible = true)}
	aria-label="Sign-out"
>
	<IconIcLogo />
	<span class="text-dark-slate-blue font-bold text-xs"
		>{shortenWithMiddleEllipsis($authStore?.identity?.getPrincipal().toText() ?? '')}</span
	>
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
			Internet Computer
		</a>

		<a
			href="https://github.com/dfinity/ic-eth-wallet"
			rel="external noopener noreferrer"
			target="_blank"
			class="flex gap-1 items-center no-underline"
			aria-label="Source code on GitHub"
		>
			<IconGitHub /> Source code
		</a>

		<Hr />

		<SignOut on:icLogoutTriggered={() => (visible = false)} />
	</div>
</Popover>
