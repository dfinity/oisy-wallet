<script lang="ts">
	import { loadCkEthHelperContractAddress } from '$eth/services/cketh.services';
	import { tokenStandard } from '$lib/derived/token.derived';

	const load = async () => {
		if ($tokenStandard !== 'ethereum') {
			return;
		}

		await loadCkEthHelperContractAddress();
	};

	$: $tokenStandard, (async () => load())();
</script>

<slot />
