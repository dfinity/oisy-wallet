<script lang="ts">
	import { IconCheckCircle, Modal } from '@dfinity/gix-components';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
	import { AIRDROPS_MODAL_IMAGE_BANNER } from '$lib/constants/test-ids.constants';
	import { modalStore } from '$lib/stores/modal.store';
	import type { AirdropDescription } from '$lib/types/airdrop-events';

	export let airdrop: AirdropDescription;
</script>

<Modal on:nnsClose={modalStore.close}>
	<span class="text-center text-xl" slot="title">{airdrop.title}</span>

	<ContentWithToolbar>
		<div class="mb-5 relative flex items-end overflow-hidden rounded-2xl max-h-60">
			<div class="max-h-60">
				<ImgBanner src={'/images/dapps/kong-swap.webp'} testId={AIRDROPS_MODAL_IMAGE_BANNER} />
			</div>
		</div>

		<span class="m-0 text-lg font-semibold">How to participate</span>
		<p class="m-0 mt-2">{airdrop.description}</p>

		{#if airdrop.requirements.length > 0}
			<Hr spacing="md" />

			<span class="text-md m-0 font-semibold">Requirements</span>
			<ul class="list-none">
				{#each airdrop.requirements as requirement}
					<li class="mt-2 flex gap-2">
						<IconCheckCircle />
						<span>{requirement}</span>
					</li>
				{/each}
			</ul>
		{/if}

		<Button paddingSmall type="button" fullWidth on:click={modalStore.close} slot="toolbar">
			Got it
		</Button>
	</ContentWithToolbar>
</Modal>
