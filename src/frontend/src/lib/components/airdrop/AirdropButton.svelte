<script lang="ts">
	import { AIRDROP } from '$lib/constants/airdrop.constants';
	import IconCelebrate from '$lib/components/icons/IconCelebrate.svelte';
	import { airdropAvailable } from '$lib/derived/airdrop.derived';
	import { fade } from 'svelte/transition';
	import { modalStore } from '$lib/stores/modal.store';
	import AirdropModal from '$lib/components/airdrop/AirdropModal.svelte';
</script>

<button class="airdrop full center mt-3" in:fade on:click={modalStore.openAirdrop}
	><IconCelebrate /> Airdrop status <span class="text-blue">Check</span></button
>

<AirdropModal />
