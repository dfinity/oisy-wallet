<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { NavigationTarget } from '@sveltejs/kit';
	import { allKnownIcrcTokensLedgerCanisterIds } from '$icp/derived/icrc.derived';
	import type { OptionIcCkToken } from '$icp/types/ic-token';
	import { isTokenIcrc } from '$icp/utils/icrc.utils';
	import ModalListItem from '$lib/components/common/ModalListItem.svelte';
	import TokenModal from '$lib/components/tokens/TokenModal.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		fromRoute: NavigationTarget | undefined;
	}
	let { fromRoute }: Props = $props();

	let twinToken = $derived(($pageToken as OptionIcCkToken)?.twinToken);
	let ckToken = $derived($pageToken as OptionIcCkToken);

	let knownIcrcToken = $derived(
		nonNullish($pageToken) && isTokenIcrc($pageToken)
			? $allKnownIcrcTokensLedgerCanisterIds.some(
					(ledgerCanisterId) => $pageToken.ledgerCanisterId === ledgerCanisterId
				)
			: true
	);
</script>

<TokenModal
	{fromRoute}
	isDeletable={!knownIcrcToken}
	isEditable={!knownIcrcToken}
	token={$pageToken}
>
	{#if nonNullish(twinToken)}
		<ModalListItem>
			{#snippet label()}
				{$i18n.tokens.details.twin_token}
			{/snippet}

			{#snippet content()}
				<output>{twinToken.name}</output>
				<Logo
					alt={replacePlaceholders($i18n.core.alt.logo, { $name: twinToken.name })}
					color="white"
					src={twinToken.icon}
				/>
			{/snippet}
		</ModalListItem>
	{/if}

	{#if nonNullish(ckToken)}
		{#if nonNullish(ckToken.ledgerCanisterId)}
			<ModalListItem>
				{#snippet label()}
					{$i18n.tokens.import.text.ledger_canister_id}
				{/snippet}

				{#snippet content()}
					<output class="break-all">{ckToken.ledgerCanisterId}</output>
					<Copy
						inline
						text={$i18n.tokens.import.text.ledger_canister_id_copied}
						value={ckToken.ledgerCanisterId}
					/>
				{/snippet}
			</ModalListItem>
		{/if}

		{#if nonNullish(ckToken.minterCanisterId)}
			{@const { minterCanisterId: safeMinterCanisterId } = ckToken}

			<ModalListItem>
				{#snippet label()}
					{$i18n.tokens.import.text.minter_canister_id}
				{/snippet}

				{#snippet content()}
					<output>{safeMinterCanisterId}</output>
					<Copy
						inline
						text={$i18n.tokens.import.text.minter_canister_id_copied}
						value={safeMinterCanisterId}
					/>
				{/snippet}
			</ModalListItem>
		{/if}
	{/if}
</TokenModal>
