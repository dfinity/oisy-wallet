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
</script>

<Modal on:nnsClose={modalStore.close}>
	<ContentWithToolbar>
		<div class="overflow-hidden rounded-2xl">
			<Img
				src={episodeFour}
				styleClass="h-[351px] w-full object-cover"
				testId={WELCOME_MODAL_IMAGE_BANNER}
			/>
		</div>

		<h3 class="my-3 text-center">{$i18n.welcome.title}</h3>
		<Html text={$i18n.welcome.description} />

		<div class="flex justify-center pt-4">
			<div>
				<ExternalLink
					href={OISY_REWARDS_URL}
					ariaLabel={$i18n.rewards.text.learn_more}
					iconVisible={false}
					asButton
					styleClass="rounded-xl px-3 py-2 secondary-light mb-3"
					testId={WELCOME_MODAL_LEARN_MORE_ANCHOR}
				>
					{$i18n.rewards.text.learn_more}
				</ExternalLink>
				<Share
					testId={WELCOME_MODAL_SHARE_ANCHOR}
					text={$i18n.rewards.text.share}
					href={OISY_WELCOME_TWITTER_URL}
				/>
			</div>
		</div>

		{#snippet toolbar()}
			<ButtonGroup>
				<Button onclick={modalStore.close} colorStyle="primary">
					{$i18n.rewards.text.open_wallet}
				</Button>
			</ButtonGroup>
		{/snippet}
	</ContentWithToolbar>
</Modal>
