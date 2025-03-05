<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import type { AirdropDescription } from '$env/types/env-airdrop';
	import AirdropBanner from '$lib/components/airdrops/AirdropBanner.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Share from '$lib/components/ui/Share.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import AirdropsRequirements from '$lib/components/airdrops/AirdropsRequirements.svelte';
	import { userProfileStore } from '$lib/stores/user-profile.store';

	export let airdrop: AirdropDescription;

	$: console.log($userProfileStore?.profile);
</script>

<Modal on:nnsClose={modalStore.close}>
	<span class="text-center text-xl" slot="title">{airdrop.title}</span>

	<ContentWithToolbar>
		<AirdropBanner />

		<span class="text-lg font-semibold">{$i18n.airdrops.text.participate_title}</span>
		<p class="mb-0 mt-2">{airdrop.description}</p>

		<ExternalLink
			href={airdrop.learnMoreHref}
			ariaLabel={$i18n.airdrops.text.learn_more}
			iconVisible={false}
			asButton
			styleClass={`rounded-xl px-3 py-2 secondary-light`}
		>
			{$i18n.airdrops.text.learn_more}
		</ExternalLink>

		<Share text={$i18n.airdrops.text.share} href={airdrop.campaignHref} styleClass="mt-2" />

		<AirdropsRequirements {airdrop} />

		<Button paddingSmall type="button" fullWidth on:click={modalStore.close} slot="toolbar">
			{$i18n.airdrops.text.modal_button_text}
		</Button>
	</ContentWithToolbar>
</Modal>
