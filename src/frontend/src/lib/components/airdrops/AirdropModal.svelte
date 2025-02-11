<script lang="ts">
	import { IconCheckCircle, Modal } from '@dfinity/gix-components';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
	import { AIRDROPS_MODAL_IMAGE_BANNER } from '$lib/constants/test-ids.constants';
	import { modalStore } from '$lib/stores/modal.store';
	import type { AirdropDescription } from '$lib/types/airdrop-events';
	import Share from '$lib/components/ui/Share.svelte';

	export let airdrop: AirdropDescription;
</script>

<Modal on:nnsClose={modalStore.close}>
	<span class="text-center text-xl" slot="title">{airdrop.title}</span>

	<ContentWithToolbar>
		<div class="relative mb-5 flex max-h-60 items-end overflow-hidden rounded-2xl">
			<div class="max-h-60">
				<ImgBanner src={'/images/dapps/kong-swap.webp'} testId={AIRDROPS_MODAL_IMAGE_BANNER} />
			</div>
		</div>

		<span class="m-0 text-lg font-semibold">How to participate</span>
		<p class="m-0 mt-2">{airdrop.description}</p>

		<Share
			text="Share on X"
			href="https://x.com/intent/post?text=I%20just%20discovered%20an%20OISY%20airdrop%20campaign%21%0AGo%20to%20OISY%3A%20https%3A%2F%2Foisy.com"
			className="mt-2"
		/>

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
