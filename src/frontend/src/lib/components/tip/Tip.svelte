<script lang="ts">
	import TipButton from '$lib/components/tip/TipButton.svelte';
	import TipCreateModal from '$lib/components/tip/TipCreateModal.svelte';
	import ButtonWithModal from '$lib/components/ui/ButtonWithModal.svelte';
	import { modalTipCreate } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
</script>

<ButtonWithModal isOpen={$modalTipCreate} onOpen={modalStore.openTipCreate}>
	{#snippet button(onclick)}
		<TipButton {onclick} />
	{/snippet}
	{#snippet modal()}
		<TipCreateModal />
	{/snippet}
</ButtonWithModal>
