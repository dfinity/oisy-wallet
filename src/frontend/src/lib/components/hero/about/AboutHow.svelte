<script lang="ts">
	import AboutItem from '$lib/components/hero/about/AboutItem.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	export let asMenuItem = false;
	export let onClick: (() => void) | undefined = undefined;
</script>

<AboutItem
	labelAsTitle={$i18n.about.how.text.title}
	labelAsMenuItem={$i18n.about.how.text.sub_title}
	openModal={modalStore.openAboutHow}
	{asMenuItem}
	{onClick}
/>
