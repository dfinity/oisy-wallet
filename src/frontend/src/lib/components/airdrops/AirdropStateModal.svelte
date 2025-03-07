<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { airdropCampaigns } from '$env/airdrop-campaigns.env';
	import type { AirdropDescription } from '$env/types/env-airdrop';
	import airdropJackpotReceived from '$lib/assets/airdrop-jackpot-received.svg';
	import airdropReceived from '$lib/assets/airdrop-received.svg';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import Share from '$lib/components/ui/Share.svelte';
	import {
		AIRDROPS_STATE_MODAL_IMAGE_BANNER,
		AIRDROPS_STATE_MODAL_SHARE_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils.js';

	export let jackpot = false;

	// TODO At the moment the selected campaign is hardcoded. In the future this should be configurable from the outside.
	let airdrop: AirdropDescription | undefined;
	$: airdrop = airdropCampaigns.find((campaign) => campaign.id === 'OISY Airdrop #1');
</script>

<Modal on:nnsClose={modalStore.close}>
	<ContentWithToolbar>
		<Img
			src={jackpot ? airdropJackpotReceived : airdropReceived}
			styleClass="w-full"
			testId={AIRDROPS_STATE_MODAL_IMAGE_BANNER}
		/>

		<div class="flex flex-col items-center gap-4 text-center">
			<h3 class="my-3"
				>{jackpot
					? replaceOisyPlaceholders($i18n.airdrops.text.state_modal_title_jackpot)
					: replaceOisyPlaceholders($i18n.airdrops.text.state_modal_title)}</h3
			>
			<span class="block w-full">{$i18n.airdrops.text.state_modal_content_text}</span>

			{#if nonNullish(airdrop)}
				<Share
					testId={AIRDROPS_STATE_MODAL_SHARE_BUTTON}
					text={$i18n.airdrops.text.share}
					href={jackpot ? airdrop.jackpotHref : airdrop.airdropHref}
				/>
			{/if}
		</div>

		<ButtonGroup slot="toolbar">
			<Button on:click={modalStore.close} colorStyle="primary"
				>{$i18n.airdrops.text.open_wallet}</Button
			>
		</ButtonGroup>
	</ContentWithToolbar>
</Modal>
