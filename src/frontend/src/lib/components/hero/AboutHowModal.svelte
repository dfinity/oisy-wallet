<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store.js';
	import { Html, Modal } from '@dfinity/gix-components';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title"
		><p class="text-xl">{replaceOisyPlaceholders($i18n.how.text.title)}</p>
	</svelte:fragment>

	<div class="stretch">
		<h2 class="mt-4">{replaceOisyPlaceholders($i18n.how.text.sub_title)}</h2>

		<p class="mt-4">
			<Html text={replaceOisyPlaceholders($i18n.how.text.cross_device)} />
		</p>

		<p class="mt-4">
			<Html text={replaceOisyPlaceholders($i18n.how.text.self_custody)} />
		</p>

		<p class="my-4">
			<Html text={replaceOisyPlaceholders($i18n.how.text.fully_on_chain)} />
		</p>
	</div>

	<button class="primary full center text-center" on:click={modalStore.close}
		>{$i18n.core.text.close}</button
	>
</Modal>
