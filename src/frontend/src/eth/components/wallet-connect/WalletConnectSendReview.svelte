<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import EthFeeDisplay from '$eth/components/fee/EthFeeDisplay.svelte';
	import type { EthereumNetwork } from '$eth/types/network';
	import { decodeErc20AbiDataValue } from '$eth/utils/transactions.utils';
	import ReviewNetwork from '$lib/components/send/ReviewNetwork.svelte';
	import SendReview from '$lib/components/send/SendReview.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import WalletConnectActions from '$lib/components/wallet-connect/WalletConnectActions.svelte';
	import WalletConnectData from '$lib/components/wallet-connect/WalletConnectData.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Network } from '$lib/types/network';
	import { formatToken } from '$lib/utils/format.utils';
    import SendReviewNetwork from "$eth/components/send/SendReviewNetwork.svelte";

	interface Props {
		amount: bigint;
		destination: string;
		data?: string;
		erc20Approve: boolean;
		sourceNetwork: EthereumNetwork;
		targetNetwork?: Network;
		onApprove: () => void;
		onReject: () => void;
	}

	let {
		amount,
		destination,
		data,
		erc20Approve,
		sourceNetwork,
		targetNetwork,
		onApprove,
		onReject
	}: Props = $props();

	let amountDisplay = $derived(
		erc20Approve && nonNullish(data) ? decodeErc20AbiDataValue({ data }) : amount
	);
</script>

<ContentWithToolbar>
	<SendReview amount={formatToken({ value: amountDisplay })} {destination}>
		{#snippet info()}
			<WalletConnectData {data} label={$i18n.wallet_connect.text.hex_data} />
		{/snippet}

		{#snippet fee()}
            <EthFeeDisplay />
		{/snippet}

		{#snippet network()}
			<ReviewNetwork destinationNetworkId={targetNetwork?.id} {sourceNetwork} />
		{/snippet}

		{#snippet replaceToolbar()}
			<WalletConnectActions {onApprove} {onReject} />
		{/snippet}
	</SendReview>
</ContentWithToolbar>
