<script lang="ts">
import { modalStore } from '$lib/stores/modal.store';
import { Modal } from '@dfinity/gix-components';
import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
</script>

<Modal on:nnsClose={modalStore.close}>
	<ContentWithToolbar>
		asdas

		<ButtonCloseModal slot="toolbar" />
	</ContentWithToolbar>
</Modal>