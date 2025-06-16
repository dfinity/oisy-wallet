<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import type { RewardCampaignDescription } from '$env/types/env-reward';
	import Sprinkles from '$lib/components/sprinkles/Sprinkles.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import Share from '$lib/components/ui/Share.svelte';
	import { TRACK_REWARD_CAMPAIGN_WIN_SHARE } from '$lib/constants/analytics.contants';
	import {
		REWARDS_STATE_MODAL_IMAGE_BANNER,
		REWARDS_STATE_MODAL_SHARE_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	interface Props {
		reward: RewardCampaignDescription;
		jackpot?: boolean;
	}

	let { reward, jackpot = false }: Props = $props();
</script>

<Sprinkles type={jackpot ? 'page-jackpot' : 'page'} />

<Modal on:nnsClose={modalStore.close}>
	<ContentWithToolbar>
		<Img
			src={jackpot ? reward.win.jackpot.banner : reward.win.default.banner}
			styleClass="w-full"
			testId={REWARDS_STATE_MODAL_IMAGE_BANNER}
		/>

		<div class="flex flex-col items-center gap-4 text-center">
			<h3 class="my-3">{jackpot ? reward.win.jackpot.title : reward.win.default.title}</h3>
			<span class="block w-full"
				>{jackpot ? reward.win.jackpot.description : reward.win.default.description}</span
			>

			<Share
				testId={REWARDS_STATE_MODAL_SHARE_BUTTON}
				text={$i18n.rewards.text.share}
				href={jackpot ? reward.win.jackpot.shareHref : reward.win.default.shareHref}
				trackEvent={{
					name: TRACK_REWARD_CAMPAIGN_WIN_SHARE,
					metadata: { campaignId: `${reward.id}`, type: `${jackpot ? 'jackpot' : 'airdrop'}` }
				}}
			/>
		</div>

		{#snippet toolbar()}
			<ButtonGroup>
				<Button onclick={modalStore.close} colorStyle="primary"
					>{$i18n.rewards.text.open_wallet}</Button
				>
			</ButtonGroup>
		{/snippet}
	</ContentWithToolbar>
</Modal>
