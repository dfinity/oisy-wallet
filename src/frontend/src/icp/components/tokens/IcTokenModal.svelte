<script lang="ts">
	import { token } from '$lib/derived/token.derived';
	import { nonNullish } from '@dfinity/utils';
	import type { IcCkToken } from '$icp/types/ic';
	import type { Token as TokenType } from '$lib/types/token';
	import { modalStore } from '$lib/stores/modal.store';
	import { Modal } from '@dfinity/gix-components';
	import Token from '$lib/components/tokens/Token.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import Value from '$lib/components/ui/Value.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';

	let twinToken: TokenType | undefined;
	$: twinToken = ($token as IcCkToken).twinToken;

	let ckToken: IcCkToken | undefined;
	$: ckToken = $token as IcCkToken;
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">{$i18n.tokens.details.title}</svelte:fragment>

	<div class="stretch">
		<Token token={$token}>
			{#if nonNullish(twinToken)}
				<Value ref="name">
					<svelte:fragment slot="label">{$i18n.tokens.details.twin_token}</svelte:fragment>
					<span class="flex gap-1 items-center">
						<output>{twinToken.name}</output>
						<Logo src={twinToken.icon} alt={`${twinToken.name} logo`} size="20px" color="white" />
					</span>
				</Value>
			{/if}

			{#if nonNullish(ckToken)}
				{#if nonNullish(ckToken.ledgerCanisterId)}
					<Value ref="name">
						<svelte:fragment slot="label"
							>{$i18n.tokens.import.text.ledger_canister_id}</svelte:fragment
						>
						<output class="break-all">{ckToken.ledgerCanisterId}</output><Copy
							value={ckToken.ledgerCanisterId}
							text={$i18n.tokens.import.text.ledger_canister_id_copied}
							inline
						/>
					</Value>
				{/if}

				{#if nonNullish(ckToken.indexCanisterId)}
					<Value ref="name">
						<svelte:fragment slot="label"
							>{$i18n.tokens.import.text.index_canister_id}</svelte:fragment
						>
						<output>{ckToken.indexCanisterId}</output><Copy
							value={ckToken.indexCanisterId}
							text={$i18n.tokens.import.text.index_canister_id_copied}
							inline
						/>
					</Value>
				{/if}

				{#if nonNullish(ckToken.minterCanisterId)}
					<Value ref="name">
						<svelte:fragment slot="label"
							>{$i18n.tokens.import.text.minter_canister_id}</svelte:fragment
						>
						<output>{ckToken.minterCanisterId}</output><Copy
							value={ckToken.minterCanisterId}
							text={$i18n.tokens.import.text.minter_canister_id_copied}
							inline
						/>
					</Value>
				{/if}
			{/if}
		</Token>
	</div>

	<button class="primary full center text-center" on:click={modalStore.close}
		>{$i18n.core.text.done}</button
	>
</Modal>
