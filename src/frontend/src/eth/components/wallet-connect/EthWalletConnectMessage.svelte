<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { WalletKitTypes } from '@reown/walletkit';
	import { erc1155Tokens } from '$eth/derived/erc1155.derived';
	import { erc20Tokens } from '$eth/derived/erc20.derived';
	import { erc721Tokens } from '$eth/derived/erc721.derived';
	import type { WalletConnectEthTypedDataApproval } from '$eth/types/wallet-connect';
	import {
		getEthTypedDataApproval,
		getEthTypedDataMethods,
		getSignedEthTypedData,
		getSignParamsMessageTypedDataV4,
		getSignParamsMessageUtf8,
		isEthSignTypedDataMethod,
		toTypedDataDomainChainId
	} from '$eth/utils/wallet-connect.utils';
	import Json from '$lib/components/ui/Json.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { areAddressesEqual } from '$lib/utils/address.utils';
	import { formatSecondsToDate, formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		request: WalletKitTypes.SessionRequest;
		invalidTypedData?: boolean;
		// Valid typed data whose schema OISY does not recognise, so none of the summary rows below
		// can be filled. Resolved in the review beside `invalidTypedData`, which does gate approval,
		// so the two states deciding what this component renders are settled in one place. Deriving
		// it here would parse the payload a third time to reach the same answer.
		unreviewableTypedData?: boolean;
	}

	let { request, invalidTypedData = false, unreviewableTypedData = false }: Props = $props();

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

	// The struct EIP-712 hashes. The RPC method above says how the request arrived; this says what
	// it is, which is the difference between "a typed-data signature" and "an unlimited allowance".
	let primaryType = $derived(json?.primaryType);

	// Only the members the schema declares are previewed: EIP-712 hashes those and nothing else, so
	// a key the schema leaves out is not part of what the user would sign and is not shown as if it
	// were. That the request carried such keys is stated instead.
	let { typedData: signedJson, hasUnsignedKeys } = $derived(
		nonNullish(json)
			? getSignedEthTypedData(json)
			: { typedData: undefined, hasUnsignedKeys: false }
	);

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

	// Listed only where the summary rows are empty. A schema OISY describes states its spender, its
	// amount and its expiry, which says more than the name of the struct they came out of.
	let methods = $derived(
		unreviewableTypedData && nonNullish(json) ? getEthTypedDataMethods(json) : []
	);

	let expirationDate = $derived(
		nonNullish(expiration)
			? formatSecondsToDate({ seconds: expiration, language: $currentLanguage })
			: undefined
	);

	let activeTab = $state('summary');

	// Levels of indentation the list will render before it stops widening.
	const MAX_NESTING_INDENT = 4;
</script>

{#if invalidTypedData}
	<MessageBox level="warning" testId="wallet-connect-invalid-typed-data-warning">
		{$i18n.wallet_connect.text.invalid_typed_data}
	</MessageBox>
{:else if unreviewableTypedData}
	<MessageBox level="error" testId="wallet-connect-unreviewable-typed-data">
		{$i18n.wallet_connect.text.unreviewable_typed_data}
	</MessageBox>
{:else if hasUnsignedKeys}
	<MessageBox level="info" testId="wallet-connect-unsigned-typed-data-info">
		{$i18n.wallet_connect.text.unsigned_typed_data_keys}
	</MessageBox>
{/if}

<Tabs
	styleClass="mt-4"
	tabs={[
		{ label: $i18n.wallet_connect.text.tab_summary, id: 'summary' },
		{ label: $i18n.wallet_connect.text.tab_raw_data, id: 'raw' }
	]}
	bind:activeTab
>
	{#if activeTab === 'summary'}
		<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.application}</p>
		<p class="mb-4 font-normal">{application}</p>

		<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.method}</p>
		<p class="mb-4 font-normal">{method}</p>

		{#if nonNullish(primaryType)}
			<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.type}</p>
			<!-- Monospaced like the struct names below it: this is the dApp's own text, not OISY's
			     copy, and it should not read as though the wallet vouched for the wording. -->
			<p class="mb-4 font-normal">
				<span class="font-mono text-sm break-all">{primaryType}</span>
			</p>
		{/if}

		<!-- The RPC method above names how the request arrived. What it would authorize is the struct being
     hashed, which is the only thing left to state once the summary rows come up empty. -->
		{#if methods.length > 0}
			<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.methods}</p>
			<ul class="mb-4 flex list-none flex-col gap-1 font-normal">
				{#each methods as { name, depth } (name)}
					<!-- Indented by how deep the struct actually sits. A single level for anything nested
					     would render a struct two deep as a member of the root, which is the reading the
					     depth exists to prevent. Clamped, because the type graph is the dApp's to shape. -->
					<li style:padding-left="{Math.min(depth, MAX_NESTING_INDENT)}rem">
						<span class="font-mono text-sm break-all">{name}</span>
					</li>
				{/each}
			</ul>
		{/if}

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
	{:else}
		<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.message}</p>
		{#if nonNullish(signedJson)}
			<!-- Opened rather than collapsed: the tab exists to be read, and a reader who switched to
			     it has already said the summary was not enough. -->
			<div class="mt-4 rounded-xs bg-disabled p-4">
				<Json _collapsed={false} json={signedJson} />
			</div>
		{:else}
			<p class="mb-4 font-normal">
				<output class="break-all">{getSignParamsMessageUtf8(request.params.request.params)}</output>
			</p>
		{/if}
	{/if}
</Tabs>
