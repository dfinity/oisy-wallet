<script lang="ts">
	import { Modal, Html } from '@dfinity/gix-components';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
</script>

<Modal on:nnsClose={modalStore.close}>
	<ContentWithToolbar>

		<div class="flex flex-col gap-4">
			<h3 class="my-3 items-center text-center">{$i18n.welcome.title}</h3>
			<Html text={$i18n.welcome.description} />
		</div>

		{#snippet toolbar()}
			<ButtonCloseModal isPrimary />
		{/snippet}
	</ContentWithToolbar>
</Modal>