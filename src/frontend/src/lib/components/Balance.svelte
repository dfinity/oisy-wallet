<script lang="ts">
	import { onMount } from 'svelte';
	import { balance as balanceService } from '$lib/services/provider.services';
	import { utils } from 'ethers';
	import type { BigNumber } from '@ethersproject/bignumber';
	import { ethAddressStore } from '$lib/stores/eth.store';

	let balance: BigNumber | undefined;

	onMount(async () => {
		// TODO: error
		// TODO: watcher?
		balance = await balanceService($ethAddressStore!);
	});
</script>

<p>Balance: <output>{utils.formatEther(`${balance ?? 0n}`)} ({`${balance ?? 0n}`}})</output></p>
