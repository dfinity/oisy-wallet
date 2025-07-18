<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ReviewNetwork from '$lib/components/send/ReviewNetwork.svelte';
	import SendData from '$lib/components/send/SendData.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import WalletConnectActions from '$lib/components/wallet-connect/WalletConnectActions.svelte';
	import WalletConnectData from '$lib/components/wallet-connect/WalletConnectData.svelte';
	import { solAddressMainnet } from '$lib/derived/address.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Balance } from '$lib/types/balance';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import { formatToken } from '$lib/utils/format.utils';
	import type { SolanaNetwork } from '$sol/types/network';

	export let amount: bigint | undefined;
	export let destination: string;
	export let data: string | undefined;
	export let token: Token;

	let network: SolanaNetwork;
	let decimals: number;
	$: ({ id: tokenId, network, decimals } = token);

	let balance: Balance | undefined;
	$: balance = $balancesStore?.[tokenId]?.data;

	let amountDisplay: OptionAmount;
	$: amountDisplay = nonNullish(amount)
		? formatToken({ value: amount, unitName: decimals })
		: undefined;
</script>

<ContentWithToolbar>
	<!-- TODO: add address for devnet and testnet -->
	<SendData
		amount={amountDisplay}
		{destination}
		{token}
		{balance}
		source={$solAddressMainnet ?? ''}
		showNullishAmountLabel
	>
		<WalletConnectData {data} label={$i18n.wallet_connect.text.hex_data} />

		<!-- TODO: add checks for insufficient funds if and when we are able to correctly parse the amount -->

		<ReviewNetwork sourceNetwork={network} slot="network" />
	</SendData>

	{#snippet toolbar()}
		<WalletConnectActions on:icApprove on:icReject />
	{/snippet}
</ContentWithToolbar>
