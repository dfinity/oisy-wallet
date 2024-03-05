<script lang="ts">
	import IcCkListener from '$icp/components/core/IcCkListener.svelte';
	import { initCkETHMinterInfoWorker } from '$icp/services/worker.ck-minter-info.services';
	import ConvertCkETHTransactionsListener from '$icp-eth/components/core/ConvertCkETHTransactionsListener.svelte';
</script>

<IcCkListener initFn={initCkETHMinterInfoWorker} />

<ConvertCkETHTransactionsListener />

<slot />
