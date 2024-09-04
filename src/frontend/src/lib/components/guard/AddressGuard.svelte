<script lang="ts">
	import { ethAddressStore } from '$lib/stores/address.store';
	import { validateEthAddress } from '$lib/services/address.services';

	$: $ethAddressStore, (async () => await validateEthAddress($ethAddressStore))();
</script>

<slot />
