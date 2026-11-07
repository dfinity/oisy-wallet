<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { SEPOLIA_NETWORK_ID } from '$env/networks/networks.eth.env';
	import { SOLANA_DEVNET_NETWORK_ID } from '$env/networks/networks.sol.env';
	import EthWalletConnectSendModal from '$eth/components/wallet-connect/EthWalletConnectSendModal.svelte';
	import EthWalletConnectSignModal from '$eth/components/wallet-connect/EthWalletConnectSignModal.svelte';
	import { SESSION_REQUEST_ETH_SEND_TRANSACTION } from '$eth/constants/wallet-connect.constants';
	import { enabledEthereumNetworks } from '$eth/derived/networks.derived';
	import type { WalletConnectEthSendTransactionParams } from '$eth/types/wallet-connect';
	import Button from '$lib/components/ui/Button.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import {
		OISY_EXTENSION_USER_REJECTED_CODE,
		OISY_EXTENSION_USER_REJECTED_MESSAGE
	} from '$lib/constants/extension.constants';
	import { ethAddress, solAddressDevnet } from '$lib/derived/address.derived';
	import { ExtensionWalletConnectListener } from '$lib/providers/extension.providers';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ExtensionError, ExtensionSignRequest } from '$lib/types/extension';
	import type { WalletConnectApproveRequestMessage } from '$lib/types/wallet-connect';
	import { toExtensionError, toWalletConnectSessionRequest } from '$lib/utils/extension.utils';
	import SolWalletConnectSignMessageModal from '$sol/components/wallet-connect/SolWalletConnectSignMessageModal.svelte';
	import SolWalletConnectSignModal from '$sol/components/wallet-connect/SolWalletConnectSignModal.svelte';
	import { SESSION_REQUEST_SOL_SIGN_MESSAGE } from '$sol/constants/wallet-connect.constants';
	import { enabledSolanaNetworks } from '$sol/derived/networks.derived';

	interface Props {
		request: ExtensionSignRequest;
		onApprove: (result: WalletConnectApproveRequestMessage) => void;
		onReject: (error: ExtensionError) => void;
	}

	let { request, onApprove, onReject }: Props = $props();

	const listener = new ExtensionWalletConnectListener({
		onApprove: (message) => onApprove(message),
		onReject: (error) => onReject(toExtensionError(error))
	});

	const sessionRequestId = Date.now();

	let sessionRequest = $derived(toWalletConnectSessionRequest({ request, id: sessionRequestId }));

	let isEthSend = $derived(
		request.chain === 'eth' && request.method === SESSION_REQUEST_ETH_SEND_TRANSACTION
	);

	let ethNetwork = $derived($enabledEthereumNetworks.find(({ id }) => id === SEPOLIA_NETWORK_ID));

	let solNetwork = $derived(
		$enabledSolanaNetworks.find(({ id }) => id === SOLANA_DEVNET_NETWORK_ID)
	);

	// Signing a message works on any network setting; sending and Solana need the testnet enabled.
	let networkMissing = $derived(
		(isEthSend && isNullish(ethNetwork)) || (request.chain === 'sol' && isNullish(solNetwork))
	);

	let currentAddress = $derived(request.chain === 'eth' ? $ethAddress : $solAddressDevnet);

	let firstTransaction = $derived(
		Array.isArray(request.params)
			? (request.params[0] as WalletConnectEthSendTransactionParams | undefined)
			: undefined
	);

	const reject = () =>
		onReject({
			code: OISY_EXTENSION_USER_REJECTED_CODE,
			message: OISY_EXTENSION_USER_REJECTED_MESSAGE
		});
</script>

{#snippet refusal(text: string)}
	<MessageBox level="warning">{text}</MessageBox>

	<Button colorStyle="error" fullWidth onclick={reject} type="button">
		{$i18n.core.text.reject}
	</Button>
{/snippet}

{#if isNullish(sessionRequest)}
	{@render refusal($i18n.extension.text.unsupported)}
{:else if networkMissing}
	{@render refusal($i18n.extension.text.networks_off)}
{:else if isNullish(currentAddress)}
	<p class="text-center">{$i18n.extension.text.loading_addresses}</p>
{:else if currentAddress !== request.address}
	{@render refusal($i18n.extension.text.wrong_account)}
{:else if isEthSend}
	{#if nonNullish(firstTransaction) && nonNullish(ethNetwork)}
		<EthWalletConnectSendModal
			{firstTransaction}
			{listener}
			request={sessionRequest}
			sourceNetwork={ethNetwork}
		/>
	{:else}
		{@render refusal($i18n.extension.text.unsupported)}
	{/if}
{:else if request.chain === 'eth'}
	<EthWalletConnectSignModal {listener} request={sessionRequest} />
{:else if nonNullish(solNetwork)}
	{#if sessionRequest.params.request.method === SESSION_REQUEST_SOL_SIGN_MESSAGE}
		<SolWalletConnectSignMessageModal {listener} network={solNetwork} request={sessionRequest} />
	{:else}
		<SolWalletConnectSignModal {listener} network={solNetwork} request={sessionRequest} />
	{/if}
{/if}
