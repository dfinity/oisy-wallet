<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import BuyButton from '$lib/components/buy/BuyButton.svelte';
	import OnRamperWidget from '$lib/components/onramper/OnRamperWidget.svelte';
	import { modalSend } from '$lib/derived/modal.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	const modalId = Symbol();
</script>

<BuyButton on:click={() => modalStore.openSend(modalId)} />

{#if $modalSend && $modalStore?.data === modalId}
	<Modal on:nnsClose={modalStore.close}>
		<svelte:fragment slot="title"
			><p class="text-xl">
				{replaceOisyPlaceholders($i18n.about.what.text.title)}
			</p></svelte:fragment
		>

		<div class="stretch pt-4">
			<OnRamperWidget />
		</div>

		<button class="secondary full center text-center" on:click={modalStore.close}
			>{$i18n.core.text.close}</button
		>
	</Modal>
{/if}
