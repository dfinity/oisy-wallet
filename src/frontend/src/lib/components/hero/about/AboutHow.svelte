<script lang="ts">
	import AboutItem from '$lib/components/hero/about/AboutItem.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import { createEventDispatcher } from 'svelte';

	export let asMenuItem = false;

	const dispatch = createEventDispatcher();

	const openModal = () => {
		dispatch('icOpenAboutModal');
		modalStore.openAboutHow();
	};
</script>

<AboutItem {asMenuItem} on:click={openModal}>
	<span slot="label">{replaceOisyPlaceholders($i18n.about.how.text.label)}</span>
</AboutItem>
