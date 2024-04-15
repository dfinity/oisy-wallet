<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import { createEventDispatcher, onMount } from 'svelte';
	import { debounce } from '@dfinity/utils';
	import { writable } from 'svelte/store';
	import { knownIcrcToken, knownIcrcTokens, type KnownIcrcTokens } from '$lib/types/known-token';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import snsTokens from '$env/tokens.sns.json';
	import { i18n } from '$lib/stores/i18n.store';
	import Card from '$lib/components/ui/Card.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import IcManageTokenToggle from '$icp/components/tokens/IcManageTokenToggle.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { fade } from 'svelte/transition';
	import IconSearch from '$lib/components/icons/IconSearch.svelte';

	const dispatch = createEventDispatcher();

	let icrcTokens: KnownIcrcTokens = [];
	onMount(() => {
		try {
			icrcTokens = knownIcrcTokens.parse(
				snsTokens.map(
					({
						metadata: {
							fee: { __bigint__ },
							...rest
						},
						...ids
					}) =>
						knownIcrcToken.parse({
							...ids,
							metadata: {
								...rest,
								fee: BigInt(__bigint__)
							}
						})
				)
			);
		} catch (err: unknown) {
			console.error(err);
		}
	});

	let filter = '';

	const filterStore = writable<string>('');
	const updateFilter = () => filterStore.set(filter);
	const debounceUpdateFilter = debounce(updateFilter);

	$: filter, debounceUpdateFilter();

	let tokens: KnownIcrcTokens = [];
	$: tokens = isNullishOrEmpty($filterStore)
		? icrcTokens
		: icrcTokens.filter(
				({ metadata: { name, symbol, alternativeName } }) =>
					name.toLowerCase().includes($filterStore.toLowerCase()) ||
					symbol.toLowerCase().includes($filterStore.toLowerCase()) ||
					(alternativeName ?? '').toLowerCase().includes($filterStore.toLowerCase())
			);

	let noTokensMatch = false;
	$: noTokensMatch = tokens.length === 0;
</script>

<Input
	name="filter"
	inputType="text"
	required
	bind:value={filter}
	placeholder={$i18n.tokens.placeholder.search_token}
	spellcheck={false}
>
	<IconSearch slot="inner-end" />
</Input>

{#if noTokensMatch}
	<button
		class="flex flex-col items-center justify-center p-16"
		in:fade
		on:click={() => dispatch('icAddToken')}
	>
		<span class="text-7xl">🤔</span>

		<span class="py-4 text-center text-blue font-bold no-underline"
			>+ {$i18n.tokens.manage.do_not_see_import}</span
		>
	</button>
{:else}
	<div class="container mt-4 h-96 pr-2 overflow-y-auto">
		{#each tokens as token}
			<Card>
				{token.metadata.name}

				<Logo
					src={`/icons/sns/${token.ledgerCanisterId}.png`}
					slot="icon"
					alt={`${token.metadata.name} logo`}
					size="52px"
					color="white"
				/>

				<span class="break-all" slot="description">
					{token.metadata.symbol}
				</span>

				<IcManageTokenToggle slot="action" />
			</Card>
		{/each}
	</div>

	<Hr />

	<button
		class="flex justify-center pt-4 pb-5 text-center w-full text-blue font-bold no-underline"
		on:click={() => dispatch('icAddToken')}>+ {$i18n.tokens.manage.do_not_see_import}</button
	>

	<ButtonGroup>
		<button class="secondary block flex-1" on:click={() => dispatch('icBack')}
			>{$i18n.core.text.back}</button
		>
		<button class="primary block flex-1" on:click={() => dispatch('icSave')}>
			{$i18n.core.text.save}
		</button>
	</ButtonGroup>
{/if}

<style lang="scss">
	.container {
		&::-webkit-scrollbar-thumb {
			background-color: #d9d9d9;
		}

		&::-webkit-scrollbar-track {
			border-radius: var(--padding-2x);
			-webkit-border-radius: var(--padding-2x);
		}

		&::-webkit-scrollbar-thumb {
			border-radius: var(--padding-2x);
			-webkit-border-radius: var(--padding-2x);
		}
	}
</style>
