<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import AirdropStatusCard from '$lib/components/airdrops/AirdropStatusCard.svelte';

	export let airdrop;
</script>

<Modal on:nnsClose={modalStore.close}>
	<ContentWithToolbar>
		<div class="flex flex-col gap-4">
			<AirdropStatusCard />

			<span class="text-2xl first-letter:capitalize">{airdrop.airdrop}</span>

			<div class="text-tertiary">
				<span>Oisy rewards users on their ICP ecosystem usage <br> THE MORE YOU SEND THE BETTER</span>

				<ul class="ml-6 list-disc">
					<li>SWAP on KongSwap</li>
					<li>Receive transactions</li>
					<li>Send transactions</li>
				</ul>

			</div>
		</div>
		<ButtonCloseModal slot="toolbar" />
	</ContentWithToolbar>
</Modal>
