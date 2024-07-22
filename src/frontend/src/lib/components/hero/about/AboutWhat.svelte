<script lang="ts">
	import AboutItem from '$lib/components/hero/about/AboutItem.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import { createEventDispatcher } from 'svelte';

	export let asMenuItem = false;

	const dispatch = createEventDispatcher();

	const openModal = () => {
		modalStore.openAboutWhat();
		dispatch('click');
	};
</script>

<AboutItem {asMenuItem} on:click={openModal}>
	<span slot="label"
		>{replaceOisyPlaceholders(
			asMenuItem ? $i18n.about.what.text.sub_title : $i18n.about.what.text.title
		)}</span
	>
</AboutItem>
