<script lang="ts">
	import { onMount } from 'svelte';
	import { balance as balanceService } from '$lib/providers/etherscan.providers';
	import { addressStore } from '$lib/stores/address.store';
	import { formatEther } from 'ethers';

	let balance: bigint | undefined;

	onMount(async () => {
		// TODO: error
		// TODO: watcher?
		balance = await balanceService($addressStore!);
	});
</script>

<p>Balance: <output>{formatEther(`${balance ?? 0n}`)} ({`${balance ?? 0n}`}})</output></p>
