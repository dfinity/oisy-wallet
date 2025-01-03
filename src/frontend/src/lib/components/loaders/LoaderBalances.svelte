<script lang="ts">
	import LoaderEthBalances from '$eth/components/loaders/LoaderEthBalances.svelte';
	import LoaderSolBalances from '$sol/components/core/LoaderSolBalances.svelte';
</script>

<LoaderEthBalances>
	<LoaderSolBalances>
		<slot />
	</LoaderSolBalances>
</LoaderEthBalances>
