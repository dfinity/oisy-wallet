<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { WalletKitTypes } from '@reown/walletkit';
	import EthWalletConnectSendTokenModal from '$eth/components/wallet-connect/EthWalletConnectSendTokenModal.svelte';
	import { enabledEthEvmNativeTokens } from '$eth/derived/native-tokens.derived';
	import type { EthereumNetwork } from '$eth/types/network';
	import type { WalletConnectEthSendTransactionParams } from '$eth/types/wallet-connect';
	import TokenActionContext from '$lib/components/send/TokenActionContext.svelte';
	import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';

	interface Props {
		request: WalletKitTypes.SessionRequest;
		firstTransaction: WalletConnectEthSendTransactionParams;
		sourceNetwork: EthereumNetwork;
		listener: OptionWalletConnectListener;
	}

	let { request, firstTransaction, sourceNetwork, listener }: Props = $props();

	let token = $derived(
		$enabledEthEvmNativeTokens.find(
			({ network: { id: networkId } }) => networkId === sourceNetwork?.id
		)
	);
</script>

{#if nonNullish(token)}
	<TokenActionContext {token}>
		<EthWalletConnectSendTokenModal {firstTransaction} {listener} {request} {sourceNetwork} />
	</TokenActionContext>
{/if}
