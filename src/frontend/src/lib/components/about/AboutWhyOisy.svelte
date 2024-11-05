<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import AboutItem from '$lib/components/about/AboutItem.svelte';
	import IconInfo from '$lib/components/icons/lucide/IconInfo.svelte';
	import { ABOUT_WHY_OISY_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	export let asMenuItem = false;

	const dispatch = createEventDispatcher();

	const openModal = () => {
		dispatch('icOpenAboutModal');
		modalStore.openAboutWhyOisy();
	};
</script>

<AboutItem {asMenuItem} on:click={openModal} testId={ABOUT_WHY_OISY_BUTTON}>
	<IconInfo slot="icon" />
	<span slot="label">{replaceOisyPlaceholders($i18n.about.why_oisy.text.label)}</span>
</AboutItem>
