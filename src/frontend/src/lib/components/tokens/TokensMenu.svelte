<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import { i18n } from '$lib/stores/i18n.store';
	import IconMore from '$lib/components/icons/IconMore.svelte';
	import TokensZeroBalance from '$lib/components/tokens/TokensZeroBalance.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';

	let visible = false;
	let button: HTMLButtonElement | undefined;
</script>

<button
	class="icon"
	bind:this={button}
	on:click={() => (visible = true)}
	aria-label={$i18n.navigation.alt.menu}
>
	<IconMore />
</button>

<Popover bind:visible anchor={button} invisibleBackdrop direction="rtl">
	<TokensZeroBalance />

	<div class="my-3">
		<Hr />
	</div>
</Popover>
