<script lang="ts">
	import AboutItem from '$lib/components/hero/about/AboutItem.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	export let asMenuItem = false;
	export let onClick: (() => void) | undefined = undefined;
</script>

<AboutItem
	labelAsTitle={$i18n.about.what.text.title}
	labelAsMenuItem={$i18n.about.what.text.sub_title}
	openModal={modalStore.openAboutWhat}
	{asMenuItem}
	{onClick}
/>
