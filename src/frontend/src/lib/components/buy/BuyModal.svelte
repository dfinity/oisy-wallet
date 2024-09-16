<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title"
		><p class="text-xl">
			{$i18n.buy.text.buy}
		</p></svelte:fragment
	>
</Modal>
