<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { OptionIcCkToken } from '$icp/types/ic-token';
	import ModalListItem from '$lib/components/common/ModalListItem.svelte';
	import TokenModal from '$lib/components/tokens/TokenModal.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token as TokenType } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	let twinToken: TokenType | undefined;
	$: twinToken = ($pageToken as OptionIcCkToken)?.twinToken;

	let ckToken: OptionIcCkToken;
	$: ckToken = $pageToken as OptionIcCkToken;
</script>

<TokenModal token={$pageToken}>
	{#if nonNullish(twinToken)}
		<ModalListItem>
			{#snippet label()}
				{$i18n.tokens.details.twin_token}
			{/snippet}

			{#snippet content()}
				<output>{twinToken.name}</output>
				<Logo
					src={twinToken.icon}
					alt={replacePlaceholders($i18n.core.alt.logo, { $name: twinToken.name })}
					color="white"
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
						value={ckToken.ledgerCanisterId}
						text={$i18n.tokens.import.text.ledger_canister_id_copied}
						inline
					/>
				{/snippet}
			</ModalListItem>
		{/if}

		{#if nonNullish(ckToken.indexCanisterId)}
			{@const { indexCanisterId: safeIndexCanisterId } = ckToken}

			<ModalListItem>
				{#snippet label()}
					{$i18n.tokens.import.text.index_canister_id}
				{/snippet}

				{#snippet content()}
					<output>{safeIndexCanisterId}</output>
					<Copy
						value={safeIndexCanisterId}
						text={$i18n.tokens.import.text.index_canister_id_copied}
						inline
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
						value={safeMinterCanisterId}
						text={$i18n.tokens.import.text.minter_canister_id_copied}
						inline
					/>
				{/snippet}
			</ModalListItem>
		{/if}
	{/if}
</TokenModal>
