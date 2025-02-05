<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import successfulReward from '$lib/assets/successful-reward.svg';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { goto } from '$app/navigation';
	import { networkUrl } from '$lib/utils/nav.utils';
	import { AppPath } from '$lib/constants/routes.constants';
	import { networkId } from '$lib/derived/network.derived';

	const navigateToAirdrops = async () => {
		await goto(networkUrl({path: AppPath.Airdrops, networkId: $networkId}));
	}

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
			<Button on:click={() => navigateToAirdrops()}>
				see airdrops
			</Button>
		</ButtonGroup>
	</ContentWithToolbar>
</Modal>
