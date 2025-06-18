<script lang="ts">
	import { Modal, Html } from '@dfinity/gix-components';
	import type { RewardCampaignDescription } from '$env/types/env-reward';
	import Sprinkles from '$lib/components/sprinkles/Sprinkles.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import Share from '$lib/components/ui/Share.svelte';
	import { TRACK_REWARD_CAMPAIGN_WIN_SHARE } from '$lib/constants/analytics.contants';
	import { OISY_REWARDS_URL } from '$lib/constants/oisy.constants';
	import {
		REWARDS_STATE_MODAL_IMAGE_BANNER,
		REWARDS_STATE_MODAL_LEARN_MORE_ANCHOR,
		REWARDS_STATE_MODAL_SHARE_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { RewardType } from '$lib/enums/reward-type';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	interface Props {
		reward: RewardCampaignDescription;
		rewardType?: RewardType;
	}

	let { reward, rewardType = RewardType.AIRDROP }: Props = $props();

	let imgSrc = $state('');
	let title = $state('');
	let description = $state('');
	let shareHref = $state('');

	$effect(() => {
		if (rewardType === RewardType.JACKPOT) {
			({ banner: imgSrc, title, description, shareHref } = reward.win.jackpot);
		} else {
			({ banner: imgSrc, title, description, shareHref } = reward.win.default);
		}
	});
</script>

<Sprinkles type={rewardType === RewardType.JACKPOT ? 'page-jackpot' : 'page'} />

<Modal on:nnsClose={modalStore.close}>
	<ContentWithToolbar>
		<Img src={imgSrc} styleClass="w-full" testId={REWARDS_STATE_MODAL_IMAGE_BANNER} />

		<div class="flex flex-col items-center gap-4 text-center">
			<h3 class="my-3">{title}</h3>
			<Html text={description} />

			<div>
				<ExternalLink
					href={OISY_REWARDS_URL}
					ariaLabel={$i18n.rewards.text.learn_more}
					iconVisible={false}
					asButton
					styleClass="rounded-xl px-3 py-2 secondary-light mb-3"
					testId={REWARDS_STATE_MODAL_LEARN_MORE_ANCHOR}
				>
					{$i18n.rewards.text.learn_more}
				</ExternalLink>

				<Share
					testId={REWARDS_STATE_MODAL_SHARE_BUTTON}
					text={$i18n.rewards.text.share}
					href={shareHref}
					trackEvent={{
						name: TRACK_REWARD_CAMPAIGN_WIN_SHARE,
						metadata: { campaignId: `${reward.id}`, type: rewardType }
					}}
				/>
			</div>
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
