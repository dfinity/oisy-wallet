<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import successfulReward from '$lib/assets/successful-reward.svg';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
	import { modalStore } from '$lib/stores/modal.store';
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">
		<span class="text-xl">You received an airdrop</span>
	</svelte:fragment>

	<ContentWithToolbar>
		<ImgBanner src={successfulReward} styleClass="aspect-auto" />

		<h3 class="my-3 text-center">Welcome to OISY</h3>
		<span class="block w-full text-center">You will receive your welcome gift any moment.</span>

		<ButtonGroup slot="toolbar">
			<ButtonCloseModal />
			<Button on:click={modalStore.close}>Take me to the wallet</Button>
		</ButtonGroup>
	</ContentWithToolbar>
</Modal>
