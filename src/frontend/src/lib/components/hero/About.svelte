<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store.js';
	import { i18n } from '$lib/stores/i18n.store.js';
	import { IconInfo } from '@dfinity/gix-components';
	import { modalAbout } from '$lib/derived/modal.derived';
	import AboutModal from '$lib/components/hero/AboutModal.svelte';
</script>

<button
	class="block text-left text-off-white my-4 max-w-72 sm:max-w-[100%]"
	on:click={modalStore.openAbout}
>
	<span>{$i18n.auth.text.title}</span>
	<span class="align-middle inline-block"><IconInfo /></span></button
>

{#if $modalAbout}
	<AboutModal />
{/if}
