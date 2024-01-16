<script lang="ts">
	import { ICP_NETWORK } from '$lib/constants/networks.constants';
	import SendDestination from '$lib/components/send/SendDestination.svelte';
	import { debounce } from '@dfinity/utils';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import type { NetworkId } from '$lib/types/network';
	import { invalidBtcAddress, isNetworkIdBTC } from '$icp/utils/send.utils';
	import { BTC_NETWORK } from '$icp/constants/ckbtc.constants';
	import { tokenStandard } from '$lib/derived/token.derived';
	import { invalidIcrcAddress } from '$icp/utils/icrc-account.utils';
	import { invalidIcpAddress } from '$icp/utils/icp-account.utils';

	export let destination = '';
	export let networkId: NetworkId | undefined = undefined;
	export let invalidDestination = false;

	const validate = () => {
		if (isNullishOrEmpty(destination)) {
			invalidDestination = false;
			return;
		}

		if (isNetworkIdBTC(networkId)) {
			invalidDestination = invalidBtcAddress({
				address: destination,
				network: BTC_NETWORK
			});
			return;
		}

		if ($tokenStandard === 'icrc') {
			invalidDestination = invalidIcrcAddress(destination);
			return;
		}

		invalidDestination = invalidIcpAddress(destination) && invalidIcrcAddress(destination);
	};

	const debounceValidate = debounce(validate);

	$: destination, debounceValidate();
</script>

<SendDestination bind:destination {invalidDestination} network={ICP_NETWORK} />
