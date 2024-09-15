<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import OnRamperWidget from '$lib/components/onramper/OnRamperWidget.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title"
		><p class="text-xl">
			{$i18n.buy.text.buy}
		</p></svelte:fragment
	>

	<div class="stretch">
		<OnRamperWidget />
	</div>

	<button class="secondary full center text-center" on:click={modalStore.close}
		>{$i18n.core.text.close}</button
	>
</Modal>
