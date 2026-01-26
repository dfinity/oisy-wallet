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
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { areAddressesEqual } from '$lib/utils/address.utils';
	import { formatSecondsToDate, formatToken } from '$lib/utils/format.utils';

	interface Props {
		request: WalletKitTypes.SessionRequest;
	}

	let { request }: Props = $props();

	let application = $derived(request.verifyContext.verified.origin);

	let method = $derived(request.params.request.method);

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

	let { spender, details: rawDetails } = $derived(
		message ?? { spender: undefined, details: undefined }
	);

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

	let amount = $derived.by(() => {
		if (
			'amount' in details &&
			(typeof details.amount === 'string' || typeof details.amount === 'number')
		) {
			try {
				return BigInt(details.amount);
			} catch (_: unknown) {
				// It could not be parsed as a BigInt, so we return undefined.
				console.warn('Could not parse amount as BigInt:', details.amount);
			}
		}
	});

	let expiration = $derived.by(() => {
		if (
			'expiration' in details &&
			(typeof details.expiration === 'string' || typeof details.expiration === 'number')
		) {
			try {
				const timestamp = Number(details.expiration);

				if (isNaN(timestamp)) {
					console.warn('Could not parse expiration as a number:', details.expiration);
					return;
				}

				return formatSecondsToDate({ seconds: timestamp, language: $currentLanguage });
			} catch (_: unknown) {
				// It could not be parsed as a BigInt, so we return undefined.
				console.warn('Could not parse expiration as Date:', details.expiration);
			}
		}
	});
</script>

<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.application}</p>
<p class="mb-4 font-normal">{application}</p>

<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.method}</p>
<p class="mb-4 font-normal">{method}</p>

{#if nonNullish(token)}
	<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.token}</p>
	<p class="mb-4 font-normal">{token.symbol}</p>

	<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.network}</p>
	<p class="mb-4 font-normal">{token.network.name}</p>

	{#if nonNullish(amount)}
		<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.amount}</p>
		<p class="mb-4 font-normal"
			>{formatToken({
				value: amount,
				unitName: token.decimals,
				displayDecimals: token.decimals
			})}
			{token.symbol}</p
		>
	{/if}
{/if}

{#if nonNullish(spender)}
	<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.spender}</p>
	<p class="mb-4 font-normal">{spender}</p>
{/if}

{#if nonNullish(expiration)}
	<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.expiration}</p>
	<p class="mb-4 font-normal">{expiration}</p>
{/if}

<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.message}</p>
{#if nonNullish(json)}
	<div class="mt-4 rounded-xs bg-disabled p-4">
		<Json _collapsed={true} {json} />
	</div>
{:else}
	<p class="mb-4 font-normal">
		<output class="break-all">{getSignParamsMessageUtf8(request.params.request.params)}</output>
	</p>
{/if}
