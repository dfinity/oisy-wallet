<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { isOnRamperDev } from '$env/onramper.env';
	import OnramperWidget from '$lib/components/onramper/OnramperWidget.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title"
		>{isOnRamperDev ? $i18n.buy.text.buy_dev : $i18n.buy.text.buy}</svelte:fragment
	>

	<div class="stretch overflow-hidden">
		<OnramperWidget />
	</div>
</Modal>
