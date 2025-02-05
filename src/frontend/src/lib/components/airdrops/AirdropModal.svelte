<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import AirdropStatusCard from '$lib/components/airdrops/AirdropStatusCard.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import type { AirdropDescription } from '$lib/types/airdrop-events';

	export let airdrop: AirdropDescription;
</script>

<Modal on:nnsClose={modalStore.close}>
	<ContentWithToolbar>
		<div class="flex flex-col gap-4">
			<AirdropStatusCard />

			<span class="text-2xl first-letter:capitalize">{airdrop.title}</span>

			<div class="text-tertiary">
				<span>{airdrop.description}</span>

				{#if airdrop.tasks.length > 0}
					<ul class="ml-6 list-disc">
						{#each airdrop.tasks as task}
							<li>{task}</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
		<ButtonCloseModal slot="toolbar" />
	</ContentWithToolbar>
</Modal>
