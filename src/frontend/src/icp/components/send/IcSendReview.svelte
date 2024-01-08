<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import SendData from '$lib/components/send/SendData.svelte';
	import { token, tokenStandard } from '$lib/derived/token.derived';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import { invalidIcpAddress } from '$icp/utils/icp-account.utils';
	import { icAccountIdentifierStore } from '$icp/derived/ic.derived';
	import IcFeeDisplay from './IcFeeDisplay.svelte';
	import { invalidIcrcAddress } from '$icp/utils/icrc-account.utils';
	import type { NetworkId } from '$lib/types/network';
	import IcSendReviewNetwork from '$icp/components/send/IcSendReviewNetwork.svelte';
	import { invalidBtcAddress, isNetworkIdBTC } from '$icp/utils/send.utils';
	import { BTC_NETWORK } from '$icp/constants/ckbtc.constants';

	export let destination = '';
	export let amount: number | undefined = undefined;
	export let networkId: NetworkId | undefined = undefined;

	let invalid = true;
	$: invalid =
		isNullishOrEmpty(destination) ||
		invalidAmount(amount) ||
		(isNetworkIdBTC(networkId)
			? invalidBtcAddress({
					address: destination,
					network: BTC_NETWORK
				})
			: $tokenStandard === 'icrc'
				? invalidIcrcAddress(destination)
				: invalidIcpAddress(destination) && invalidIcrcAddress(destination));

	const dispatch = createEventDispatcher();

	let source: string;
	$: source = $icAccountIdentifierStore ?? '';
</script>

<SendData {amount} {destination} token={$token} {source}>
	<IcFeeDisplay slot="fee" />
	<IcSendReviewNetwork {networkId} slot="network" />
</SendData>

<div class="flex justify-end gap-1">
	<button class="secondary" on:click={() => dispatch('icBack')}>Back</button>
	<button
		class="primary"
		disabled={invalid}
		class:opacity-10={invalid}
		on:click={() => dispatch('icSend')}
	>
		Send
	</button>
</div>
