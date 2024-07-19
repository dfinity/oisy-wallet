<script lang="ts">
	import AboutWhat from '$lib/components/hero/about/AboutWhat.svelte';
	import AboutHow from '$lib/components/hero/about/AboutHow.svelte';
	import { Popover } from '@dfinity/gix-components';
	import IconMenu from '$lib/components/icons/IconMenu.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import { modalAboutHow, modalAboutWhat } from '$lib/derived/modal.derived';
	import AboutWhatModal from '$lib/components/hero/about/AboutWhatModal.svelte';
	import AboutHowModal from '$lib/components/hero/about/AboutHowModal.svelte';

	let visible = false;
	let button: HTMLButtonElement | undefined;
</script>

<div class="hidden md:flex gap-4">
	<AboutWhat />
	<AboutHow />
</div>

<div class="flex md:hidden">
	<button
		class="user icon desktop-wide !bg-black !bg-opacity-30 !border !border-white !border-opacity-30"
		bind:this={button}
		on:click={() => (visible = !visible)}
		aria-label={replaceOisyPlaceholders($i18n.about.text.title)}><IconMenu /></button
	>

	<Popover bind:visible anchor={button} direction="rtl">
		<ul class="flex flex-col gap-4 list-none">
			<li><AboutWhat asMenuItem onClick={() => (visible = false)} /></li>
			<li><AboutHow asMenuItem onClick={() => (visible = false)} /></li>
		</ul>
	</Popover>
</div>

{#if $modalAboutWhat}
	<AboutWhatModal />
{/if}

{#if $modalAboutHow}
	<AboutHowModal />
{/if}
