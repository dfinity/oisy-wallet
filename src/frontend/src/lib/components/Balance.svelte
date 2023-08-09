<script lang="ts">
	import { onMount } from 'svelte';
	import { balance as balanceService } from '$lib/services/provider.services';
	import { utils } from 'ethers';
	import type { BigNumber } from '@ethersproject/bignumber';

	let balance: BigNumber | undefined;

	onMount(async () => {
		// TODO: error
		// TODO: watcher?
		balance = await balanceService('0x6D1b7ceAd24FBaf153a3a18f09395Fd2f9C64912');
	});
</script>

<p>Balance: <output>{utils.formatEther(`${balance ?? 0n}`)}</output></p>
