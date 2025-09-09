<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { isOnRamperDev } from '$env/rest/onramper.env';
	import OnramperWidget from '$lib/components/onramper/OnramperWidget.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
</script>

<Modal on:nnsClose={modalStore.close}>
	{#snippet title()}
		{isOnRamperDev ? $i18n.buy.text.buy_dev : $i18n.buy.text.buy}
	{/snippet}

	<div class="stretch flex overflow-hidden">
		<div class="w-full overflow-auto">
			<OnramperWidget />
		</div>
	</div>
</Modal>

<style lang="scss">
	.stretch {
		--stretch-padding-bottom: var(--padding-3x);
	}
</style>
