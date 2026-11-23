<script lang="ts">
	import { isTokenErc } from '$eth/utils/erc.utils';
	import { isTokenIc } from '$icp/utils/icrc.utils';
	import Copy from '$lib/components/ui/Copy.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { getTokenDisplayName, getTokenDisplaySymbol } from '$lib/utils/token.utils';
	import { isTokenSpl } from '$sol/utils/spl.utils';

	interface Props {
		token: Token;
	}

	let { token }: Props = $props();

	// The address that identifies the token on its network. An EVM token reads "Token address" here
	// too, like an SPL one: under the "Token" line, "Contract address" leaves open which contract is
	// meant. Native coins have none, so the line is left out for them.
	let tokenAddress = $derived.by(() => {
		if (isTokenErc(token) || isTokenSpl(token)) {
			return {
				address: token.address,
				label: $i18n.tokens.text.token_address,
				copiedText: $i18n.tokens.details.token_address_copied
			};
		}

		if (isTokenIc(token)) {
			return {
				address: token.ledgerCanisterId,
				label: $i18n.tokens.import.text.ledger_canister_id,
				copiedText: $i18n.tokens.import.text.ledger_canister_id_copied
			};
		}
	});
</script>

<ModalValue>
	{#snippet label()}
		{$i18n.tokens.details.token}
	{/snippet}

	{#snippet mainValue()}
		{getTokenDisplaySymbol(token)}
	{/snippet}

	{#snippet secondaryValue()}
		{getTokenDisplayName(token)}
	{/snippet}
</ModalValue>

{#if tokenAddress}
	<ModalValue>
		{#snippet label()}
			{tokenAddress.label}
		{/snippet}

		{#snippet mainValue()}
			<span class="flex items-center gap-1">
				{shortenWithMiddleEllipsis({ text: tokenAddress.address })}
				<Copy inline text={tokenAddress.copiedText} value={tokenAddress.address} />
			</span>
		{/snippet}
	</ModalValue>
{/if}
