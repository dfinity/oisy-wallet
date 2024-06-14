<script lang="ts">
	import { IconClose, Input } from '@dfinity/gix-components';
	import { createEventDispatcher } from 'svelte';
	import { debounce, nonNullish } from '@dfinity/utils';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import Card from '$lib/components/ui/Card.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { fade } from 'svelte/transition';
	import IconSearch from '$lib/components/icons/IconSearch.svelte';
	import type { ManageableToken, TokenId } from '$lib/types/token';
	import ManageTokenToggle from '$lib/components/tokens/ManageTokenToggle.svelte';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { manageableNetworkTokens } from '$lib/derived/network-tokens.derived';

	const dispatch = createEventDispatcher();

	let filterTokens = '';
	const updateFilter = () => (filterTokens = filter);
	const debounceUpdateFilter = debounce(updateFilter);

	let filter = '';
	$: filter, debounceUpdateFilter();

	let filteredTokens: ManageableToken[] = [];
	$: filteredTokens = isNullishOrEmpty(filterTokens)
		? $manageableNetworkTokens
		: $manageableNetworkTokens.filter(
				({ name, symbol, ...rest }) =>
					name.toLowerCase().includes(filterTokens.toLowerCase()) ||
					symbol.toLowerCase().includes(filterTokens.toLowerCase()) ||
					('alternativeName' in rest &&
						(rest as { alternativeName?: string }).alternativeName
							?.toLowerCase()
							.includes(filterTokens.toLowerCase()))
			);

	let tokens: ManageableToken[] = [];
	$: tokens = filteredTokens.map(({ id, enabled, ...rest }) => ({
		id,
		enabled: modifiedTokens[id]?.enabled ?? enabled,
		...rest
	}));

	let noTokensMatch = false;
	$: noTokensMatch = tokens.length === 0;

	let modifiedTokens: Record<TokenId, ManageableToken> = {};
	const onToggle = ({ detail: { id, enabled, ...rest } }: CustomEvent<ManageableToken>) => {
		const { [id]: current, ...tokens } = modifiedTokens;

		if (nonNullish(current)) {
			modifiedTokens = { ...tokens };
			return;
		}

		modifiedTokens = {
			[id]: {
				id,
				enabled,
				...rest
			},
			...tokens
		};
	};

	let saveDisabled = true;
	$: saveDisabled = Object.keys(modifiedTokens).length === 0;

	const save = () => dispatch('icSave', Object.values(modifiedTokens));
</script>

<div class="mb-4">
	<Input
		name="filter"
		inputType="text"
		bind:value={filter}
		placeholder={$i18n.tokens.placeholder.search_token}
		spellcheck={false}
	>
		<svelte:fragment slot="inner-end">
			{#if noTokensMatch}
				<button on:click={() => (filter = '')} aria-label={$i18n.tokens.manage.text.clear_filter}>
					<IconClose />
				</button>
			{:else}
				<IconSearch />
			{/if}
		</svelte:fragment>
	</Input>
</div>

{#if noTokensMatch}
	<button
		class="flex flex-col items-center justify-center py-16 w-full"
		in:fade
		on:click={() => dispatch('icAddToken')}
	>
		<span class="text-7xl">🤔</span>

		<span class="py-4 text-center text-blue font-bold no-underline"
			>+ {$i18n.tokens.manage.text.do_not_see_import}</span
		>
	</button>
{:else}
	<div class="container md:max-h-96 pr-2 pt-1 overflow-y-auto">
		{#each tokens as token (token.symbol)}
			<Card>
				{token.name}

				<Logo
					src={token.icon}
					slot="icon"
					alt={replacePlaceholders($i18n.core.alt.logo, { $name: token.name })}
					size="medium"
					color="white"
				/>

				<span class="break-all" slot="description">
					{token.symbol}
				</span>

				<ManageTokenToggle slot="action" {token} on:icToken={onToggle} />
			</Card>
		{/each}
	</div>

	<Hr />

	<ButtonGroup>
		<button class="secondary block flex-1" on:click={() => dispatch('icClose')}
			>{$i18n.core.text.cancel}</button
		>
		<button
			class="primary block flex-1"
			on:click={save}
			class:opacity-10={saveDisabled}
			disabled={saveDisabled}
		>
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
