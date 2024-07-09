<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store.js';
	import { Html, Modal } from '@dfinity/gix-components';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">{replaceOisyPlaceholders($i18n.about.text.title)}</svelte:fragment>

	<div class="stretch">
		<h2>{replaceOisyPlaceholders($i18n.about.text.sub_title)}</h2>

		<p class="mt-4">
			<Html text={replaceOisyPlaceholders($i18n.about.text.description)} />
		</p>

		<p class="my-4">
			{replaceOisyPlaceholders($i18n.about.text.features)}
		</p>

		<ul class="flex flex-col gap-4 ml-3 list-disc">
			<li><Html text={replaceOisyPlaceholders($i18n.about.text.browser_based)} /></li>
			<li><Html text={replaceOisyPlaceholders($i18n.about.text.cross_device)} /></li>
			<li><Html text={replaceOisyPlaceholders($i18n.about.text.network_custody)} /></li>
			<li><Html text={replaceOisyPlaceholders($i18n.about.text.fully_on_chain)} /></li>
			<li><Html text={replaceOisyPlaceholders($i18n.about.text.interoperable)} /></li>
			<li><Html text={replaceOisyPlaceholders($i18n.about.text.free)} /></li>
		</ul>
	</div>

	<button class="primary full center text-center" on:click={modalStore.close}
		>{$i18n.core.text.close}</button
	>
</Modal>
