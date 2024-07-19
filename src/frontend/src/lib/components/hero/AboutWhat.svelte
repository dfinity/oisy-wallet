<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store.js';
	import { i18n } from '$lib/stores/i18n.store.js';
	import { modalAboutWhat } from '$lib/derived/modal.derived';
	import AboutWhatModal from '$lib/components/hero/AboutWhatModal.svelte';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
</script>

<button class="text-center text-white text-lg font-bold px-4" on:click={modalStore.openAboutWhat}>
	<span>{replaceOisyPlaceholders($i18n.what.text.title)}</span>
</button>

{#if $modalAboutWhat}
	<AboutWhatModal />
{/if}
