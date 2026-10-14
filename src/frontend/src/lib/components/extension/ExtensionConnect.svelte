<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import SignerOrigin from '$lib/components/signer/SignerOrigin.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { ethAddress, solAddressDevnet } from '$lib/derived/address.derived';
	import { testnetsEnabled } from '$lib/derived/testnets.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type {
		ExtensionAccount,
		ExtensionConnectRequest,
		ExtensionPairRequest
	} from '$lib/types/extension';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';

	interface Props {
		request: ExtensionConnectRequest | ExtensionPairRequest;
		onApprove: (account: ExtensionAccount) => void;
		onReject: () => void;
	}

	let { request, onApprove, onReject }: Props = $props();

	// The extension works on Sepolia and Solana devnet only, so connecting needs testnets on: without
	// them the site could connect but every Solana request and every send would then be refused.
	let account = $derived<ExtensionAccount | undefined>(
		$testnetsEnabled && nonNullish($ethAddress) && nonNullish($solAddressDevnet)
			? { eth: $ethAddress, sol: $solAddressDevnet }
			: undefined
	);

	// A site sees only the address of the chain it asked for; the extension itself keeps both.
	let shared = $derived(
		isNullish(account)
			? []
			: [
					{ chain: 'eth', label: $i18n.extension.connect.eth_network, address: account.eth },
					{ chain: 'sol', label: $i18n.extension.connect.sol_network, address: account.sol }
				].filter(({ chain }) => request.kind === 'pair' || request.chain === chain)
	);

	const approve = (event: SubmitEvent) => {
		event.preventDefault();

		if (nonNullish(account)) {
			onApprove(account);
		}
	};
</script>

<form method="POST" onsubmit={approve}>
	<h2 class="mb-4 text-center">
		{request.kind === 'pair'
			? $i18n.extension.connect.title_extension
			: $i18n.extension.connect.title_site}
	</h2>

	{#if request.kind === 'connect'}
		<SignerOrigin payload={{ origin: request.origin }} />
	{/if}

	{#if !$testnetsEnabled}
		<MessageBox level="warning">{$i18n.extension.text.testnets_off}</MessageBox>
	{:else if isNullish(account)}
		<p class="mb-6 text-center">{$i18n.extension.text.loading_addresses}</p>
	{:else}
		<ul
			class="mb-4 flex list-none flex-col gap-3 rounded-lg border border-brand-subtle-10 bg-brand-subtle-20 p-6"
		>
			{#each shared as { label, address } (address)}
				<li>
					<p class="text-sm font-bold">{label}</p>
					<output class="break-all" title={address}
						>{shortenWithMiddleEllipsis({ text: address })}</output
					>
				</li>
			{/each}
		</ul>

		<p class="mb-6 text-center text-sm text-tertiary">
			{request.kind === 'pair'
				? $i18n.extension.connect.extension_keeps
				: $i18n.extension.connect.site_sees}
		</p>
	{/if}

	<ButtonGroup>
		<Button colorStyle="error" onclick={onReject} type="button">
			{$i18n.core.text.reject}
		</Button>
		<Button colorStyle="success" disabled={isNullish(account)} type="submit">
			{$i18n.extension.connect.connect}
		</Button>
	</ButtonGroup>
</form>
