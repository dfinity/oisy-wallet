<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, onMount } from 'svelte';
	import { fade, blur } from 'svelte/transition';
	import { icrcTokens } from '$icp/derived/icrc.derived';
	import {
		loadAndAssertAddCustomToken,
		type ValidateTokenData
	} from '$icp/services/ic-add-custom-tokens.service';
	import AddTokenWarning from '$lib/components/tokens/AddTokenWarning.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import SkeletonCardWithoutAmount from '$lib/components/ui/SkeletonCardWithoutAmount.svelte';
	import TextWithLogo from '$lib/components/ui/TextWithLogo.svelte';
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

<div class="stretch min-h-[20vh]">
	<div class="mb-4 rounded-lg bg-brand-subtle p-4">
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
		<div in:fade>
			<Value ref="network" element="div">
				<svelte:fragment slot="label">{$i18n.tokens.manage.text.network}</svelte:fragment>
				<TextWithLogo name={token.token.network.name} icon={token.token.network.icon} />
			</Value>

			<Value ref="ledgerId" element="div">
				<svelte:fragment slot="label">{$i18n.tokens.import.text.ledger_canister_id}</svelte:fragment
				>
				{token.token.ledgerCanisterId}
			</Value>

			<Value ref="ledgerId" element="div">
				<svelte:fragment slot="label">{$i18n.tokens.import.text.index_canister_id}</svelte:fragment>
				{token.token.indexCanisterId}
			</Value>

			<AddTokenWarning />
		</div>
	{/if}
</div>

{#if nonNullish(token)}
	<div in:fade>
		<ButtonGroup>
			<ButtonBack on:click={back} />
			<Button disabled={invalid} on:click={() => dispatch('icSave')}>
				{$i18n.tokens.import.text.add_the_token}
			</Button>
		</ButtonGroup>
	</div>
{/if}
