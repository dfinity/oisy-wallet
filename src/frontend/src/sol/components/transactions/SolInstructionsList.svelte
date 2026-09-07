<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
	import ContactOrToken from '$lib/components/contact/ContactOrToken.svelte';
	import AddressActions from '$lib/components/ui/AddressActions.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import { enabledSplTokens } from '$sol/derived/spl.derived';
	import { splTokenMetadataStore } from '$sol/stores/spl-token-metadata.store';
	import type { SolInstructionSummary } from '$sol/types/sol-instruction-summary';
	import type { SolNetBalanceChange } from '$sol/types/sol-transaction-summary';
	import { solAccountExplorerUrl } from '$sol/utils/sol-explorer.utils';
	import { solTokenSymbol, solUnknownTokenAddresses } from '$sol/utils/sol-token-name.utils';
	import {
		flattenInstructions,
		formatSolInstructionSummary
	} from '$sol/utils/sol-transaction-summary.utils';
	import { findEnabledSplToken } from '$sol/utils/spl.utils';

	interface Props {
		instructions: SolInstructionSummary[];
		token: Token;
		// The net changes of the same transaction, whose decimals stand in for the ones an
		// unchecked transfer does not carry.
		netChanges?: SolNetBalanceChange[];
	}

	let { instructions, token, netChanges }: Props = $props();

	const splToken = (tokenAddress: string) =>
		findEnabledSplToken({
			tokens: $enabledSplTokens,
			tokenAddress,
			networkId: token.network.id
		});

	// The mints this list mentions, so a placeholder is numbered against the others it stands
	// with. A list naming two mints "Unknown token" twice says less than their addresses would.
	let unknownTokenAddresses = $derived(
		solUnknownTokenAddresses({
			tokenAddresses: flattenInstructions(instructions).map(({ tokenAddress }) => tokenAddress),
			tokens: $enabledSplTokens,
			networkId: token.network.id,
			metadata: $splTokenMetadataStore
		})
	);

	const symbolOf = (tokenAddress: string | undefined): string =>
		solTokenSymbol({
			tokenAddress,
			tokens: $enabledSplTokens,
			networkId: token.network.id,
			metadata: $splTokenMetadataStore,
			unknownTokenAddresses,
			unknownTokenLabel: $i18n.transaction.text.unknown_token,
			nativeSymbol: SOLANA_TOKEN.symbol
		});

	const decimalsOf = (tokenAddress: string | undefined): number =>
		isNullish(tokenAddress)
			? SOLANA_TOKEN.decimals
			: (splToken(tokenAddress)?.decimals ??
				netChanges?.find((change) => change.tokenAddress === tokenAddress)?.decimals ??
				0);
</script>

{#snippet line(instruction: SolInstructionSummary)}
	{@const { text, detail } = formatSolInstructionSummary({
		instruction,
		i18n: $i18n,
		symbolOf,
		decimalsOf
	})}

	<!-- The counterparty of a transfer, the delegate of an approval, the new authority of a
	     handover, the program a route ran through: an address the user has something to check. The
	     account a creation or a close names is a derived token account nobody recognises, and the
	     token already identifies it. -->
	{@const actionAddress =
		instruction.counterparty ?? instruction.newAuthority ?? instruction.program}

	<span class="flex flex-col gap-1" data-tid="sol-instruction">
		<span class="flex flex-wrap items-center gap-x-1">
			<span>
				{text}{#if nonNullish(detail)}<span class="text-tertiary">{` · ${detail}`}</span>{/if}
			</span>

			<!-- A contact or a token OISY knows names the account; the address is what is left when
			     neither does. The controls copy and open the address either way, never the name. -->
			{#if nonNullish(actionAddress)}
				<!-- A program's published name is the program's own claim about itself, so it is shown
				     as a label beside the address rather than in place of it: the address is the part
				     the user can check. -->
				{#if nonNullish(instruction.programName)}
					<span class="text-tertiary">{instruction.programName}</span>
				{/if}

				<ContactOrToken identifier={actionAddress} showFallback />

				<AddressActions
					copyAddress={actionAddress}
					copyAddressText={$i18n.wallet.text.address_copied}
					externalLink={solAccountExplorerUrl({ network: token.network, address: actionAddress })}
					externalLinkAriaLabel={$i18n.wallet_connect.alt.open_address_block_explorer}
					inline
				/>
			{/if}
		</span>

		<!-- The legs sit under the route that produced them: flat, a four-leg swap reads as four
		     unrelated transfers, which is the one thing the grouping exists to prevent. -->
		{#if nonNullish(instruction.children)}
			<span class="flex flex-col gap-1 ps-4">
				{#each instruction.children as child, i (i)}
					{@render line(child)}
				{/each}
			</span>
		{/if}
	</span>
{/snippet}

<div class="flex flex-col gap-1" data-tid="sol-instructions-list">
	{#each instructions as instruction, i (i)}
		{@render line(instruction)}
	{:else}
		<span class="text-tertiary">{$i18n.transaction.text.tab_unavailable}</span>
	{/each}
</div>
