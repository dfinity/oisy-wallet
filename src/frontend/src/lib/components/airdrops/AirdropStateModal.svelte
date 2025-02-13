<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import airdropJackpotReceived from '$lib/assets/airdrop-jackpot-received.svg';
	import airdropReceived from '$lib/assets/airdrop-received.svg';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
	import Share from '$lib/components/ui/Share.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { type AirdropDescription, airdropCampaigns } from '$lib/types/airdrop-events';
	import {nonNullish} from "@dfinity/utils";

	export let jackpot = false;

	let airdrop: AirdropDescription;
	$: airdrop = airdropCampaigns.find((campaign) => campaign.id === 'OISY Airdrop');
</script>

<Modal on:nnsClose={modalStore.close}>
	<ContentWithToolbar>
		<ImgBanner src={jackpot ? airdropJackpotReceived : airdropReceived} styleClass="aspect-auto" />

		<div class="gap-4 flex flex-col items-center text-center">
			<h3 class="my-3"
				>{jackpot
					? $i18n.airdrops.text.state_modal_title_jackpot
					: $i18n.airdrops.text.state_modal_title}</h3
			>
			<span class="block w-full">{$i18n.airdrops.text.state_modal_content_text}</span>

			{#if nonNullish(airdrop)}
				<Share
					text={$i18n.airdrops.text.share}
					href={jackpot
						? airdrop.jackpotHref
						: airdrop.airdropHref}
				/>
			{/if}
		</div>

		<ButtonGroup slot="toolbar">
			<Button on:click={modalStore.close} colorStyle="secondary"
				>{$i18n.airdrops.text.open_wallet}</Button
			>
		</ButtonGroup>
	</ContentWithToolbar>
</Modal>
