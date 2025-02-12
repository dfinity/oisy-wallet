<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import airdropJackpotReceived from '$lib/assets/airdrop-jackpot-received.svg';
	import airdropReceived from '$lib/assets/airdrop-received.svg';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import {i18n} from "$lib/stores/i18n.store";
	import Share from "$lib/components/ui/Share.svelte";

	export let jackpot = false;
</script>

<Modal on:nnsClose={modalStore.close}>
	<ContentWithToolbar>
		<ImgBanner src={jackpot ? airdropJackpotReceived : airdropReceived} styleClass="aspect-auto" />

		<div class="flex flex-col items-center gap-4">
			<h3 class="my-3 text-center"
				>{jackpot
					? "Congratulations on winning today's highest airdrop!"
					: "Congratulations on winning today's airdrop!"}</h3
			>
			<span class="block w-full text-center"
				>Share your victory on Twitter to qualify for another chance to win.</span
			>
			<Share
					text={$i18n.airdrops.text.share}
					href={"https://x.com/intent/post?text=I%20just%20discovered%20an%20OISY%20airdrop%20campaign%21%0AGo%20to%20OISY%3A%20https%3A%2F%2Foisy.com"}
			/>
		</div>

		<ButtonGroup slot="toolbar">
			<Button on:click={modalStore.close} colorStyle="secondary">Take me to the wallet</Button>
		</ButtonGroup>
	</ContentWithToolbar>
</Modal>
