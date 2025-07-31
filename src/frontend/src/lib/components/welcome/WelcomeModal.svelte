<script lang="ts">
	import { Modal, Html } from '@dfinity/gix-components';
	import episodeFour from '$lib/assets/oisy-episode-four.svg';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import Share from '$lib/components/ui/Share.svelte';
	import { OISY_REWARDS_URL, OISY_WELCOME_TWITTER_URL } from '$lib/constants/oisy.constants';
	import {
		WELCOME_MODAL_IMAGE_BANNER,
		WELCOME_MODAL_LEARN_MORE_ANCHOR,
		WELCOME_MODAL_SHARE_ANCHOR
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">
		<span class="text-xl">{replaceOisyPlaceholders($i18n.welcome.title)}</span>
	</svelte:fragment>

	<ContentWithToolbar>
		<div class="overflow-hidden rounded-2xl">
			<Img
				src={episodeFour}
				styleClass="h-[351px] w-full object-cover"
				testId={WELCOME_MODAL_IMAGE_BANNER}
			/>
		</div>

		<div class="text-center">
			<h3 class="my-3">{$i18n.welcome.subtitle}</h3>
			<Html text={$i18n.welcome.description} />
		</div>

		<div class="flex justify-center pt-4">
			<div>
				<ExternalLink
					ariaLabel={$i18n.rewards.text.learn_more}
					asButton
					href={OISY_REWARDS_URL}
					iconVisible={false}
					styleClass="rounded-xl px-3 py-2 secondary-light mb-3"
					testId={WELCOME_MODAL_LEARN_MORE_ANCHOR}
				>
					{$i18n.rewards.text.learn_more}
				</ExternalLink>
				<Share
					href={OISY_WELCOME_TWITTER_URL}
					testId={WELCOME_MODAL_SHARE_ANCHOR}
					text={$i18n.rewards.text.share}
				/>
			</div>
		</div>

		{#snippet toolbar()}
			<ButtonGroup>
				<Button colorStyle="primary" onclick={modalStore.close}>
					{$i18n.rewards.text.open_wallet}
				</Button>
			</ButtonGroup>
		{/snippet}
	</ContentWithToolbar>
</Modal>
