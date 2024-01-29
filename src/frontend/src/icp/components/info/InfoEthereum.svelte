<script lang="ts">
	import eth from '$lib/assets/eth.svg';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import { isBusy } from '$lib/derived/busy.derived';

	const openReceive = () => modalStore.openReceive();
</script>

<div class="pr-2">
	<h4 class="flex gap-2 items-center font-medium">
		<Logo src={eth} size="20px" alt={`Ethereum logo`} />
		<span>Receive from Ethereum Network (ETH)</span>
	</h4>

	<p class="text-misty-rose mt-3">
		ckETH is a multi-chain bitcoin twin on the Internet Computer created by canister smart contract
		that directly hold native bitcoin.
	</p>

	<button class="primary mt-6" disabled={$isBusy} class:opacity-50={$isBusy} on:click={openReceive}>
		Receive from ETH network</button
	>
</div>
