<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import AboutItem from '$lib/components/hero/about/AboutItem.svelte';
	import IconInfo from '$lib/components/icons/lucide/IconInfo.svelte';
	import { ABOUT_HOW_MODAL_OPEN_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	export let asMenuItem = false;

	const dispatch = createEventDispatcher();

	const openModal = () => {
		dispatch('icOpenAboutModal');
		modalStore.openAboutHow();
	};
</script>


<AboutItem {asMenuItem} on:click={openModal} testId={asMenuItem ? ABOUT_HOW_MODAL_OPEN_MENU_ITEM : ABOUT_HOW_MODAL_OPEN_BUTTON}>
	<IconInfo slot="icon" />
	<span slot="label">{replaceOisyPlaceholders($i18n.about.how.text.label)}</span>
</AboutItem>
