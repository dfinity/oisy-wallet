<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { Erc20Metadata } from '$eth/types/erc20';
	import { isNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import { erc20TokensStore } from '$eth/stores/erc20.store';
	import Value from '$lib/components/ui/Value.svelte';
	import { infuraErc20Providers } from '$eth/providers/infura-erc20.providers';
	import { i18n } from '$lib/stores/i18n.store';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import AddTokenWarning from '$lib/components/tokens/AddTokenWarning.svelte';
	import { tokenWithFallback } from '$lib/derived/token.derived';
	import { authStore } from '$lib/stores/auth.store';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
	import { addUserToken } from '$lib/api/backend.api';
	import { selectedChainId, selectedEthereumNetwork } from '$eth/derived/network.derived';
	import { mapErc20Token } from '$eth/utils/erc20.utils';
	import type { WizardModal } from '@dfinity/gix-components';

	export let modal: WizardModal;
	export let saveProgressStep: ProgressStepsAddToken;
	export let contractAddress = '';

	let metadata: Erc20Metadata | undefined;

	onMount(async () => {
		if (
			$erc20TokensStore?.find(
				({ address }) => address.toLowerCase() === contractAddress.toLowerCase()
			) !== undefined
		) {
			toastsError({
				msg: { text: $i18n.tokens.error.already_available }
			});

			dispatch('icBack');
			return;
		}

		try {
			const { metadata: metadataApi } = infuraErc20Providers($tokenWithFallback.network.id);
			metadata = await metadataApi({ address: contractAddress });

			if (isNullish(metadata?.symbol) || isNullish(metadata?.name)) {
				toastsError({
					msg: { text: $i18n.tokens.error.incomplete_metadata }
				});

				dispatch('icBack');
				return;
			}

			if (
				$erc20TokensStore?.find(
					({ symbol, name }) =>
						symbol.toLowerCase() === (metadata?.symbol.toLowerCase() ?? '') ||
						name.toLowerCase() === (metadata?.name.toLowerCase() ?? '')
				) !== undefined
			) {
				toastsError({
					msg: { text: $i18n.tokens.error.duplicate_metadata }
				});

				dispatch('icBack');
				return;
			}
		} catch (err: unknown) {
			toastsError({
				msg: { text: $i18n.tokens.error.loading_metadata },
				err
			});

			dispatch('icBack');
		}
	});

	let invalid = true;
	$: invalid = isNullishOrEmpty(contractAddress) || isNullish(metadata);

	const dispatch = createEventDispatcher();

	const save = async () => {
		if (isNullishOrEmpty(contractAddress)) {
			toastsError({
				msg: { text: $i18n.tokens.error.invalid_contract_address }
			});
			return;
		}

		if (isNullish(metadata)) {
			toastsError({
				msg: { text: $i18n.tokens.error.no_metadata }
			});
			return;
		}

		if (isNullish($authStore.identity)) {
			await nullishSignOut();
			return;
		}

		modal.next();

		try {
			saveProgressStep = ProgressStepsAddToken.SAVE;

			await addUserToken({
				identity: $authStore.identity,
				token: {
					chain_id: $selectedChainId,
					contract_address: contractAddress,
					symbol: [],
					decimals: [],
					version: []
				}
			});

			saveProgressStep = ProgressStepsAddToken.UPDATE_UI;

			erc20TokensStore.add(
				mapErc20Token({
					address: contractAddress,
					exchange: 'ethereum',
					category: 'custom',
					network: $selectedEthereumNetwork,
					...metadata
				})
			);

			saveProgressStep = ProgressStepsAddToken.DONE;

			setTimeout(() => dispatch('icClose'), 750);
		} catch (err: unknown) {
			toastsError({
				msg: { text: $i18n.tokens.error.unexpected },
				err
			});

			modal.back();
		}
	};
</script>

<div class="stretch">
	<Value ref="contractAddress" element="div">
		<svelte:fragment slot="label">{$i18n.tokens.text.contract_address}</svelte:fragment>
		{contractAddress}
	</Value>

	<Value ref="contractName" element="div">
		<svelte:fragment slot="label">{$i18n.core.text.name}</svelte:fragment>
		{#if isNullish(metadata)}
			&#8203;
		{:else}
			<span in:fade>{metadata.name}</span>
		{/if}
	</Value>

	<Value ref="contractSymbol" element="div">
		<svelte:fragment slot="label">{$i18n.core.text.symbol}</svelte:fragment>
		{#if isNullish(metadata)}
			&#8203;
		{:else}
			<span in:fade>{metadata.symbol}</span>
		{/if}
	</Value>

	<Value ref="contractDecimals" element="div">
		<svelte:fragment slot="label">{$i18n.core.text.decimals}</svelte:fragment>
		{#if isNullish(metadata)}
			&#8203;
		{:else}
			<span in:fade>{metadata.decimals}</span>
		{/if}
	</Value>

	<AddTokenWarning />
</div>

<ButtonGroup>
	<button class="secondary block flex-1" on:click={() => dispatch('icBack')}
		>{$i18n.core.text.back}</button
	>
	<button
		class="primary block flex-1"
		disabled={invalid}
		class:opacity-10={invalid}
		on:click={save}
	>
		{$i18n.tokens.import.text.add_the_token}
	</button>
</ButtonGroup>
