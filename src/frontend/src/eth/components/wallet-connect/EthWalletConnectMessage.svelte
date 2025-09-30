<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { WalletKitTypes } from '@reown/walletkit';
	import { erc1155Tokens } from '$eth/derived/erc1155.derived';
	import { erc20Tokens } from '$eth/derived/erc20.derived';
	import { erc721Tokens } from '$eth/derived/erc721.derived';
	import {
		getSignParamsMessageTypedDataV4,
		getSignParamsMessageUtf8
	} from '$eth/utils/wallet-connect.utils';
	import Json from '$lib/components/ui/Json.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { areAddressesEqual } from '$lib/utils/address.utils';

	interface Props {
		request: WalletKitTypes.SessionRequest;
	}

	let { request }: Props = $props();

	let json = $derived.by(() => {
		try {
			return getSignParamsMessageTypedDataV4(request.params.request.params);
		} catch (_: unknown) {
			return undefined;
		}
	});

	let {
		domain: { chainId },
		message
	} = $derived(json ?? { domain: { chainId: undefined }, message: undefined });

	let { details: rawDetails } = $derived(message ?? { details: undefined });

	let details = $derived(
		nonNullish(rawDetails) && typeof rawDetails === 'object' ? rawDetails : {}
	);

	let address = $derived(
		'token' in details && typeof details.token === 'string' ? details.token : undefined
	);

	let token = $derived.by(() => {
		if (isNullish(address) || isNullish(chainId)) {
			return;
		}

		const tokens = [...$erc20Tokens, ...$erc721Tokens, ...$erc1155Tokens];

		return tokens.find(
			({ address: tokenAddress, network: { id: networkId, chainId: tokenChainId } }) =>
				areAddressesEqual({
					address1: tokenAddress,
					address2: address,
					networkId
				}) && tokenChainId.toString() === chainId
		);
	});
</script>

{#if nonNullish(token)}
	<!-- /* v8 ignore next */ -->
	<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.token}:</p>
	<p class="mb-4 font-normal">{token.symbol}</p>

	<!-- /* v8 ignore next */ -->
	<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.network}:</p>
	<p class="mb-4 font-normal">{token.network.name}</p>
{/if}

<!-- /* v8 ignore next */ -->
<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.message}:</p>
{#if nonNullish(json)}
	<div class="rounded-xs mt-4 bg-disabled p-4">
		<Json _collapsed={true} {json} />
	</div>
{:else}
	<p class="mb-4 font-normal">
		<output class="break-all">{getSignParamsMessageUtf8(request.params.request.params)}</output>
	</p>
{/if}
