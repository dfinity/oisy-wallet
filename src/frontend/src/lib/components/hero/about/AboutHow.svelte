<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import AboutItem from '$lib/components/hero/about/AboutItem.svelte';
	import { ABOUT_HOW_MODAL_OPEN_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	export let asMenuItem = false;
	export let shortLabel = false;

	const dispatch = createEventDispatcher();

	const openModal = () => {
		dispatch('icOpenAboutModal');
		modalStore.openAboutHow();
	};
</script>

<AboutItem {asMenuItem} on:click={openModal} testId={ABOUT_HOW_MODAL_OPEN_BUTTON}>
	<span slot="label"
		>{replaceOisyPlaceholders(
			shortLabel ? $i18n.about.how.text.short_label : $i18n.about.how.text.label
		)}
	</span>
</AboutItem>
