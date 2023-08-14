<script lang="ts">
	import { onMount } from 'svelte';
	import { balance as balanceService } from '$lib/providers/etherscan.providers';
	import { addressStore } from '$lib/stores/address.store';
	import type { BigNumber } from 'alchemy-sdk';
	import { Utils } from 'alchemy-sdk';

	let balance: BigNumber | undefined;

	onMount(async () => {
		// TODO: error
		// TODO: watcher?
		balance = await balanceService($addressStore!);
	});
</script>

<p>Balance: <output>{Utils.formatEther(`${balance ?? 0n}`)} ({`${balance ?? 0n}`}})</output></p>
