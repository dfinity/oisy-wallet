<script lang="ts">
	import AboutItem from '$lib/components/hero/about/AboutItem.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	export let asMenuItem = false;
</script>

<AboutItem openModal={modalStore.openAboutHow} {asMenuItem} on:click>
	<span slot="label"
		>{replaceOisyPlaceholders(
			asMenuItem ? $i18n.about.how.text.sub_title : $i18n.about.how.text.title
		)}</span
	>
</AboutItem>
