<script lang="ts">
	import { onMount } from 'svelte';
	import { loadCkEthHelperContractAddress } from '$eth/services/cketh.services';

	onMount(async () => await loadCkEthHelperContractAddress());
</script>

<slot />
