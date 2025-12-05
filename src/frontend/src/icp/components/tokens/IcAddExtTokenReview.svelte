<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
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
	import {extTokens} from "$icp/derived/ext.derived";

	interface Props {
		extCanisterId?: string;
		metadata?: ValidateTokenData;
		onBack: () => void;
		onSave: () => void;
	}

	let {
		extCanisterId,
		metadata = $bindable(),
		onBack,
		onSave
	}: Props = $props();

	let invalid = $derived(isNullish(metadata));

	const back = () => onBack();

	onMount(async () => {
		const { result, data } = await loadAndAssertAddCustomToken({
			ledgerCanisterId: extCanisterId,
			identity: $authIdentity,
			icrcTokens: $extTokens
		});

		if (result === 'error' || isNullish(data)) {
			back();
			return;
		}

		metadata = data;
	});
</script>

<ContentWithToolbar>
	<div class="mb-4 rounded-lg bg-brand-subtle-20 p-4">
		{#if isNullish(metadata)}
			<SkeletonCardWithoutAmount>{$i18n.tokens.import.text.verifying}</SkeletonCardWithoutAmount>
		{:else}
			<div in:blur>
				<Card noMargin>
					{metadata.token.name}

					{#snippet icon()}
						{#if nonNullish(metadata)}
							<Logo
								alt={replacePlaceholders($i18n.core.alt.logo, { $name: metadata.token.name })}
								color="white"
								size="lg"
								src={metadata.token.icon}
							/>
						{/if}
					{/snippet}

					{#snippet description()}
						{#if nonNullish(metadata)}
							<span class="break-all">
								{metadata.token.symbol}
							</span>
						{/if}
					{/snippet}
				</Card>
			</div>
		{/if}
	</div>

	{#if nonNullish(metadata)}
		{@const {
			network: safeNetwork,
			ledgerCanisterId: safeLedgerCanisterId,
		} = metadata.token}
		<div in:fade>
			<Value element="div" ref="network">
				{#snippet label()}
					{$i18n.tokens.manage.text.network}
				{/snippet}
				{#snippet content()}
					<NetworkWithLogo network={safeNetwork} />
				{/snippet}
			</Value>

			<Value element="div" ref="ledgerId">
				{#snippet label()}{$i18n.tokens.import.text.ledger_canister_id}{/snippet}
				{#snippet content()}
					{safeLedgerCanisterId}
				{/snippet}
			</Value>



			<AddTokenWarning />
		</div>
	{/if}

	{#snippet toolbar()}
		<div in:fade>
			{#if nonNullish(metadata)}
				<ButtonGroup>
					<ButtonBack onclick={back} />
					<Button disabled={invalid} onclick={onSave}>
						{$i18n.tokens.import.text.add_the_token}
					</Button>
				</ButtonGroup>
			{/if}
		</div>
	{/snippet}
</ContentWithToolbar>
