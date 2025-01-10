<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import successfulReward from '$lib/assets/successful-reward.svg';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">
		<span class="text-xl">{$i18n.vip.reward.text.title_successful}</span>
	</svelte:fragment>

	<ContentWithToolbar>
		<ImgBanner src={successfulReward} styleClass="aspect-auto" />

		<h3 class="my-3 text-center"
			>{replaceOisyPlaceholders($i18n.vip.reward.text.reward_received)}</h3
		>
		<span class="block w-full text-center">{$i18n.vip.reward.text.reward_received_description}</span
		>

		<Button
			paddingSmall
			colorStyle="secondary"
			type="button"
			fullWidth
			on:click={modalStore.close}
			slot="toolbar"
		>
			{$i18n.vip.reward.text.open_wallet}
		</Button>
	</ContentWithToolbar>
</Modal>
