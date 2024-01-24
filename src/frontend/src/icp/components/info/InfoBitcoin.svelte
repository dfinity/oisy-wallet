<script lang="ts">
	import bitcoin from '$lib/assets/bitcoin.svg';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import { isBusy } from '$lib/derived/busy.derived';

	const openReceive = () => modalStore.openReceive();
</script>

<div class="pr-2">
	<h4 class="flex gap-2 items-center font-medium">
		<Logo src={bitcoin} size="20px" alt={`Bitcoin logo`} />
		<span>Receive from Bitcoin Network (BTC)</span>
	</h4>

	<p class="text-misty-rose mt-3">
		ckBTC is a multi-chain bitcoin twin on the Internet Computer created by canister smart contract
		that directly hold native bitcoin.
	</p>

	<p class="text-misty-rose mt-3">
		Note that incoming Bitcoin transactions require 12 confirmations. Check status on a block
		explorer.
	</p>

	<button class="primary mt-6" disabled={$isBusy} class:opacity-50={$isBusy} on:click={openReceive}>
		Receive from BTC network</button
	>
</div>
