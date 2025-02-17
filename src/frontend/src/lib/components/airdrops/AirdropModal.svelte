<script lang="ts">
	import { IconCheckCircle, Modal } from '@dfinity/gix-components';
	import type { AirdropDescription } from '$env/types/env-airdrop';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import Share from '$lib/components/ui/Share.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	export let airdrop: AirdropDescription;
</script>

<Modal on:nnsClose={modalStore.close}>
	<span class="text-xl text-center" slot="title">{airdrop.title}</span>

	<ContentWithToolbar>
		<!-- TODO display image banner -->

		<span class="text-lg font-semibold">{$i18n.airdrops.text.participate_title}</span>
		<p class="mb-0 mt-2">{airdrop.description}</p>

		<Share text={$i18n.airdrops.text.share} href={airdrop.campaignHref} styleClass="mt-2" />

		{#if airdrop.requirements.length > 0}
			<Hr spacing="md" />

			<span class="text-md font-semibold">{$i18n.airdrops.text.requirements_title}</span>
			<ul class="list-none">
				{#each airdrop.requirements as requirement}
					<li class="mt-2 gap-2 flex">
						<IconCheckCircle />
						<span>{requirement}</span>
					</li>
				{/each}
			</ul>
		{/if}

		<Button paddingSmall type="button" fullWidth on:click={modalStore.close} slot="toolbar">
			{$i18n.airdrops.text.modal_button_text}
		</Button>
	</ContentWithToolbar>
</Modal>
