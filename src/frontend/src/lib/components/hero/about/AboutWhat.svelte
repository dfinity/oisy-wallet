<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import AboutItem from '$lib/components/hero/about/AboutItem.svelte';
	import IconStar from '$lib/components/icons/lucide/IconStar.svelte';
	import { ABOUT_WHAT_MODAL_OPEN_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	export let asMenuItem = false;

	const dispatch = createEventDispatcher();

	const openModal = () => {
		dispatch('icOpenAboutModal');
		modalStore.openAboutWhat();
	};
</script>

<AboutItem {asMenuItem} on:click={openModal} testId={ABOUT_WHAT_MODAL_OPEN_BUTTON}>
	<IconStar slot="icon" />
	<span slot="label">{replaceOisyPlaceholders($i18n.about.what.text.label)}</span>
</AboutItem>
