<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store.js';
	import { i18n } from '$lib/stores/i18n.store.js';
	import { modalAboutHow } from '$lib/derived/modal.derived';
	import AboutHowModal from '$lib/components/hero/AboutHowModal.svelte';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
</script>

<button class="text-center text-white text-lg font-bold px-4" on:click={modalStore.openAboutHow}>
	<span>{replaceOisyPlaceholders($i18n.how.text.title)}</span>
</button>

{#if $modalAboutHow}
	<AboutHowModal />
{/if}
