<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { rewardCampaigns } from '$env/reward-campaigns.env';
	import type { RewardDescription } from '$env/types/env-reward';
	import rewardJackpotReceived from '$lib/assets/reward-jackpot-received.svg';
	import rewardReceived from '$lib/assets/reward-received.svg';
	import Sprinkles from '$lib/components/sprinkles/Sprinkles.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import Share from '$lib/components/ui/Share.svelte';
	import {
		REWARDS_STATE_MODAL_IMAGE_BANNER,
		REWARDS_STATE_MODAL_SHARE_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	export let jackpot = false;

	// TODO At the moment the selected campaign is hardcoded. In the future this should be configurable from the outside.
	let reward: RewardDescription | undefined;
	$: reward = rewardCampaigns.find((campaign) => campaign.id === 'OISY Airdrop #1');
</script>

<Sprinkles />

<Modal on:nnsClose={modalStore.close}>
	<ContentWithToolbar>
		<Img
			src={jackpot ? rewardJackpotReceived : rewardReceived}
			styleClass="w-full"
			testId={REWARDS_STATE_MODAL_IMAGE_BANNER}
		/>

		<div class="flex flex-col items-center gap-4 text-center">
			<h3 class="my-3"
				>{jackpot
					? replaceOisyPlaceholders($i18n.rewards.text.state_modal_title_jackpot)
					: replaceOisyPlaceholders($i18n.rewards.text.state_modal_title)}</h3
			>
			<span class="block w-full">{$i18n.rewards.text.state_modal_content_text}</span>

			{#if nonNullish(reward)}
				<Share
					testId={REWARDS_STATE_MODAL_SHARE_BUTTON}
					text={$i18n.rewards.text.share}
					href={jackpot ? reward.jackpotHref : reward.airdropHref}
				/>
			{/if}
		</div>

		<ButtonGroup slot="toolbar">
			<Button on:click={modalStore.close} colorStyle="primary"
				>{$i18n.rewards.text.open_wallet}</Button
			>
		</ButtonGroup>
	</ContentWithToolbar>
</Modal>
