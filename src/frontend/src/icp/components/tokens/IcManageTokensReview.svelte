<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import { createEventDispatcher, onMount } from 'svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { fade, blur } from 'svelte/transition';
	import { loadAndAssertCustomToken, type ValidateTokenData } from '$icp/services/token.service';
	import { authStore } from '$lib/stores/auth.store';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import Card from '$lib/components/ui/Card.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import SkeletonCardWithoutAmount from '$lib/components/ui/SkeletonCardWithoutAmount.svelte';
	import AddTokenWarning from '$lib/components/tokens/AddTokenWarning.svelte';

	export let ledgerCanisterId = '';
	export let indexCanisterId = '';

	let invalid = true;
	$: invalid = isNullish(token);

	const dispatch = createEventDispatcher();
	const back = () => dispatch('icBack');

	let token: ValidateTokenData | undefined;

	onMount(async () => {
		const { result, data } = await loadAndAssertCustomToken({
			ledgerCanisterId,
			indexCanisterId,
			identity: $authStore.identity
		});

		if (result === 'error' || isNullish(data)) {
			back();
			return;
		}

		token = data;
	});
</script>

<div class="bg-light-blue p-4 mb-4 rounded-lg">
	{#if isNullish(token)}
		<SkeletonCardWithoutAmount>{$i18n.tokens.import.text.verifying}</SkeletonCardWithoutAmount>
	{:else}
		<div in:blur>
			<Card noMargin>
				{token.token.name}

				<Logo
					src={token.token.icon}
					slot="icon"
					alt={`${token.token.name} logo`}
					size="52px"
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
	<div in:fade>
		<Value ref="ledgerId" element="div">
			<svelte:fragment slot="label">{$i18n.tokens.import.text.ledger_canister_id}</svelte:fragment>
			{token.token.ledgerCanisterId}
		</Value>

		<Value ref="ledgerId" element="div">
			<svelte:fragment slot="label">{$i18n.tokens.import.text.index_canister_id}</svelte:fragment>
			{token.token.indexCanisterId}
		</Value>

		<AddTokenWarning />

		<div class="flex justify-end gap-1 mb-2">
			<button class="secondary" on:click={back}>{$i18n.core.text.back}</button>
			<button
				class="primary"
				disabled={invalid}
				class:opacity-10={invalid}
				on:click={() => dispatch('icSave')}
			>
				{$i18n.core.text.save}
			</button>
		</div>
	</div>
{/if}
