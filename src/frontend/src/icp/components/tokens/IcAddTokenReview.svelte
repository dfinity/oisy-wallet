<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, onMount } from 'svelte';
	import { blur, fade } from 'svelte/transition';
	import { icrcTokens } from '$icp/derived/icrc.derived';
	import {
		loadAndAssertAddCustomToken,
		type ValidateTokenData
	} from '$icp/services/ic-add-custom-tokens.service';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import AddTokenWarning from '$lib/components/tokens/AddTokenWarning.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import SkeletonCardWithoutAmount from '$lib/components/ui/SkeletonCardWithoutAmount.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let ledgerCanisterId: string | undefined;
	export let indexCanisterId: string | undefined;

	let invalid = true;
	$: invalid = isNullish(token);

	const dispatch = createEventDispatcher();
	const back = () => dispatch('icBack');

	let token: ValidateTokenData | undefined;

	onMount(async () => {
		const { result, data } = await loadAndAssertAddCustomToken({
			ledgerCanisterId,
			indexCanisterId,
			identity: $authIdentity,
			icrcTokens: $icrcTokens
		});

		if (result === 'error' || isNullish(data)) {
			back();
			return;
		}

		token = data;
	});
</script>

<ContentWithToolbar>
	<div class="mb-4 rounded-lg bg-brand-subtle-20 p-4">
		{#if isNullish(token)}
			<SkeletonCardWithoutAmount>{$i18n.tokens.import.text.verifying}</SkeletonCardWithoutAmount>
		{:else}
			<div in:blur>
				<Card noMargin>
					{token.token.name}

					<Logo
						src={token.token.icon}
						slot="icon"
						alt={replacePlaceholders($i18n.core.alt.logo, { $name: token.token.name })}
						size="lg"
						color="white"
					/>

					<span class="break-all" slot="description">
						{token.token.symbol}
					</span>
				</Card>
			</div>
		{/if}
	</div>

	{#if nonNullish(token)}
		{@const {
			network: safeNetwork,
			ledgerCanisterId: safeLedgerCanisterId,
			indexCanisterId: safeIndexCanisterId
		} = token.token}
		<div in:fade>
			<Value ref="network" element="div">
				{#snippet label()}
					{$i18n.tokens.manage.text.network}
				{/snippet}
				{#snippet content()}
					<NetworkWithLogo network={safeNetwork} />
				{/snippet}
			</Value>

			<Value ref="ledgerId" element="div">
				{#snippet label()}{$i18n.tokens.import.text.ledger_canister_id}{/snippet}
				{#snippet content()}
					{safeLedgerCanisterId}
				{/snippet}
			</Value>

			{#if nonNullish(indexCanisterId)}
				<Value ref="indexId" element="div">
					{#snippet label()}
						{$i18n.tokens.import.text.index_canister_id}
					{/snippet}
					{#snippet content()}
						{safeIndexCanisterId}
					{/snippet}
				</Value>
			{/if}

			<AddTokenWarning />
		</div>
	{/if}

	<div slot="toolbar" in:fade>
		{#if nonNullish(token)}
			<ButtonGroup>
				<ButtonBack onclick={back} />
				<Button disabled={invalid} on:click={() => dispatch('icSave')}>
					{$i18n.tokens.import.text.add_the_token}
				</Button>
			</ButtonGroup>
		{/if}
	</div>
</ContentWithToolbar>
