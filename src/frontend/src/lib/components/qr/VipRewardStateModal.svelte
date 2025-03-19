<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import failedVipReward from '$lib/assets/failed-vip-reward.svg';
	import successfulVipReward from '$lib/assets/successful-vip-reward.svg';
	import Sprinkles from '$lib/components/sprinkles/Sprinkles.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	export let isSuccessful: boolean;
</script>

{#if isSuccessful}
	<Sprinkles />
{/if}

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">
		<span class="text-xl"
			>{isSuccessful
				? $i18n.vip.reward.text.title_successful
				: $i18n.vip.reward.text.title_failed}</span
		>
	</svelte:fragment>

	<ContentWithToolbar>
		<ImgBanner
			src={isSuccessful ? successfulVipReward : failedVipReward}
			styleClass="aspect-auto"
		/>

		<h3 class="my-3 text-center"
			>{isSuccessful
				? replaceOisyPlaceholders($i18n.vip.reward.text.reward_received)
				: $i18n.vip.reward.text.reward_failed}</h3
		>
		<span class="block w-full text-center"
			>{isSuccessful
				? $i18n.vip.reward.text.reward_received_description
				: $i18n.vip.reward.text.reward_failed_description}</span
		>

		<Button
			paddingSmall
			colorStyle="secondary"
			type="button"
			fullWidth
			on:click={modalStore.close}
			slot="toolbar"
		>
			{isSuccessful ? $i18n.vip.reward.text.open_wallet : $i18n.vip.reward.text.open_wallet}
		</Button>
	</ContentWithToolbar>
</Modal>
