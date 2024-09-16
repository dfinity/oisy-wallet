<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import OnRamperWidget from '$lib/components/onramper/OnRamperWidget.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">{$i18n.buy.text.buy}</svelte:fragment>

	<div class="stretch">
		<OnRamperWidget />
	</div>
</Modal>
