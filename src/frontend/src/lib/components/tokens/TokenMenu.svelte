<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import { i18n } from '$lib/stores/i18n.store';
	import IconMore from '$lib/components/icons/IconMore.svelte';
	let visible = false;
	let button: HTMLButtonElement | undefined;
</script>

<button
	class="icon text-white"
	bind:this={button}
	on:click={() => (visible = true)}
	aria-label={$i18n.tokens.alt.context_menu}
>
	<IconMore />
</button>

<Popover bind:visible anchor={button} invisibleBackdrop direction="rtl">
	<slot />
</Popover>
