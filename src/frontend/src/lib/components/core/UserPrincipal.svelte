<script lang="ts">
	import IconIcLogo from '$lib/components/icons/IconIcLogo.svelte';
	import { authStore } from '$lib/stores/auth.store';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { Popover } from '@dfinity/gix-components';
	import SignOut from '$lib/components/core/SignOut.svelte';

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
	<SignOut on:icLogoutTriggered={() => (visible = false)} />
</Popover>
