<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import airdropReceived from '$lib/assets/airdrop-received.svg';
	import airdropJackpotReceived from '$lib/assets/airdrop-jackpot-received.svg';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
	import { modalStore } from '$lib/stores/modal.store';

	export let jackpot: boolean = false;
</script>

<Modal on:nnsClose={modalStore.close}>
	<ContentWithToolbar>
		<ImgBanner src={jackpot ? airdropJackpotReceived : airdropReceived} styleClass="aspect-auto" />

		<h3 class="my-3 text-center">{jackpot ? 'Congratulations on winning today\'s highest airdrop!' : 'Congratulations on winning today\'s airdrop!'}</h3>
		<span class="block w-full text-center">Share your victory on Twitter to qualify for another chance to win.</span>

		<ButtonGroup slot="toolbar">
			<Button on:click={modalStore.close} colorStyle="secondary">Take me to the wallet</Button>
		</ButtonGroup>
	</ContentWithToolbar>
</Modal>
