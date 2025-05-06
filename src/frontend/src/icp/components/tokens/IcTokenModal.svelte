<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { OptionIcCkToken } from '$icp/types/ic-token';
	import Token from '$lib/components/tokens/Token.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { token } from '$lib/stores/token.store';
	import type { Token as TokenType } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	let twinToken: TokenType | undefined;
	$: twinToken = ($token as OptionIcCkToken)?.twinToken;

	let ckToken: OptionIcCkToken;
	$: ckToken = $token as OptionIcCkToken;
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">{$i18n.tokens.details.title}</svelte:fragment>

	<ContentWithToolbar>
		{#if nonNullish($token)}
			<Token token={$token}>
				{#if nonNullish(twinToken)}
					<Value ref="name">
						{#snippet label()}
							{$i18n.tokens.details.twin_token}
						{/snippet}
						{#snippet content()}
							<span class="flex items-center gap-1">
								<output>{twinToken.name}</output>
								<Logo
									src={twinToken.icon}
									alt={replacePlaceholders($i18n.core.alt.logo, { $name: twinToken.name })}
									color="white"
								/>
							</span>
						{/snippet}
					</Value>
				{/if}

				{#if nonNullish(ckToken)}
					{#if nonNullish(ckToken.ledgerCanisterId)}
						<Value ref="name">
							{#snippet label()}
								{$i18n.tokens.import.text.ledger_canister_id}
							{/snippet}
							{#snippet content()}
								<output class="break-all">{ckToken.ledgerCanisterId}</output><Copy
									value={ckToken.ledgerCanisterId}
									text={$i18n.tokens.import.text.ledger_canister_id_copied}
									inline
								/>
							{/snippet}
						</Value>
					{/if}

					{#if nonNullish(ckToken.indexCanisterId)}
						{@const { indexCanisterId: safeIndexCanisterId } = ckToken}
						<Value ref="name">
							{#snippet label()}
								{$i18n.tokens.import.text.index_canister_id}
							{/snippet}
							{#snippet content()}
								<output>{safeIndexCanisterId}</output><Copy
									value={safeIndexCanisterId}
									text={$i18n.tokens.import.text.index_canister_id_copied}
									inline
								/>
							{/snippet}
						</Value>
					{/if}

					{#if nonNullish(ckToken.minterCanisterId)}
						{@const { minterCanisterId: safeMinterCanisterId } = ckToken}
						<Value ref="name">
							{#snippet label()}
								{$i18n.tokens.import.text.minter_canister_id}
							{/snippet}
							{#snippet content()}
								<output>{safeMinterCanisterId}</output><Copy
									value={safeMinterCanisterId}
									text={$i18n.tokens.import.text.minter_canister_id_copied}
									inline
								/>
							{/snippet}
						</Value>
					{/if}
				{/if}
			</Token>
		{/if}

		<ButtonDone onclick={modalStore.close} slot="toolbar" />
	</ContentWithToolbar>
</Modal>
