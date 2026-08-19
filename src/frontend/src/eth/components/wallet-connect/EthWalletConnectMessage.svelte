<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { WalletKitTypes } from '@reown/walletkit';
	import { erc1155Tokens } from '$eth/derived/erc1155.derived';
	import { erc20Tokens } from '$eth/derived/erc20.derived';
	import { erc721Tokens } from '$eth/derived/erc721.derived';
	import type { WalletConnectEthTypedDataApproval } from '$eth/types/wallet-connect';
	import {
		getEthTypedDataApproval,
		getSignParamsMessageTypedDataV4,
		getSignParamsMessageUtf8,
		isEthSignTypedDataMethod,
		toTypedDataDomainChainId
	} from '$eth/utils/wallet-connect.utils';
	import Json from '$lib/components/ui/Json.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { areAddressesEqual } from '$lib/utils/address.utils';
	import { formatSecondsToDate, formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		request: WalletKitTypes.SessionRequest;
		invalidTypedData?: boolean;
	}

	let { request, invalidTypedData = false }: Props = $props();

	let application = $derived(request.verifyContext.verified.origin);

	let method = $derived(request.params.request.method);

	// Only a typed-data method is previewed as typed data. A raw-message request
	// whose payload happens to parse as EIP-712 is signed as a plain message, so
	// previewing it as a permit would describe something that is not signed.
	let json = $derived.by(() => {
		if (!isEthSignTypedDataMethod(method)) {
			return;
		}

		try {
			return getSignParamsMessageTypedDataV4(request.params.request.params);
		} catch (_: unknown) {
			return undefined;
		}
	});

	let {
		domain: { chainId }
	} = $derived(json ?? { domain: { chainId: undefined } });

	// The summary is derived from the signed schema, never from the shape of the
	// message: a key the schema does not declare is absent from the digest, so
	// displaying it would describe an approval that is not the one being signed.
	let approval: WalletConnectEthTypedDataApproval = $derived(
		(nonNullish(json) ? getEthTypedDataApproval(json) : undefined) ?? {}
	);

	let { spender, token: address, amount, unlimited, expiration } = $derived(approval);

	// EIP-712 declares `chainId` as a `uint256`, so a number, a decimal string and a hex string are
	// all the same chain and all hash alike. Comparing the text matched one form only.
	let domainChainId = $derived(toTypedDataDomainChainId(chainId));

	let token = $derived.by(() => {
		if (isNullish(address) || isNullish(domainChainId)) {
			return;
		}

		const tokens = [...$erc20Tokens, ...$erc721Tokens, ...$erc1155Tokens];

		return tokens.find(
			({ address: tokenAddress, network: { id: networkId, chainId: tokenChainId } }) =>
				areAddressesEqual({
					address1: tokenAddress,
					address2: address,
					networkId
				}) && tokenChainId === domainChainId
		);
	});

	// The allowance is stated whether or not the token is one OISY lists. An unlimited approval is
	// the one that matters most and the one whose figure is least readable: 2^256-1 written out in
	// digits is how an unlimited allowance passes for an ordinary number, so it is named instead.
	let amountText = $derived.by(() => {
		if (unlimited === true) {
			return replacePlaceholders($i18n.core.text.unlimited, {
				$items: token?.symbol ?? ''
			}).trim();
		}

		if (isNullish(amount)) {
			return;
		}

		return nonNullish(token)
			? `${formatToken({ value: amount, unitName: token.decimals, displayDecimals: token.decimals })} ${token.symbol}`
			: // With no token there are no decimals to scale by, so the figure stays in the units the
				// struct states it in and says so, rather than posing as a token amount.
				`${amount} ${$i18n.wallet_connect.text.token_units}`;
	});

	let expirationDate = $derived(
		nonNullish(expiration)
			? formatSecondsToDate({ seconds: expiration, language: $currentLanguage })
			: undefined
	);
</script>

{#if invalidTypedData}
	<MessageBox level="warning" testId="wallet-connect-invalid-typed-data-warning">
		{$i18n.wallet_connect.text.invalid_typed_data}
	</MessageBox>
{/if}

<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.application}</p>
<p class="mb-4 font-normal">{application}</p>

<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.method}</p>
<p class="mb-4 font-normal">{method}</p>

{#if nonNullish(token)}
	<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.token}</p>
	<p class="mb-4 font-normal">{token.symbol}</p>

	<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.network}</p>
	<p class="mb-4 font-normal">{token.network.name}</p>
{:else if nonNullish(address)}
	<!-- A token OISY does not list is still the contract the allowance is over, so the address is
	     shown rather than the row dropped: an unnamed contract is a fact, its absence is not. -->
	<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.token}</p>
	<p class="mb-4 font-normal"><output class="break-all">{address}</output></p>
{/if}

{#if nonNullish(amountText)}
	<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.amount}</p>
	<p class="mb-4 font-normal" data-tid="wallet-connect-typed-data-amount">{amountText}</p>
{/if}

{#if nonNullish(spender)}
	<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.spender}</p>
	<p class="mb-4 font-normal">{spender}</p>
{/if}

{#if nonNullish(expirationDate)}
	<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.expiration}</p>
	<p class="mb-4 font-normal">{expirationDate}</p>
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
