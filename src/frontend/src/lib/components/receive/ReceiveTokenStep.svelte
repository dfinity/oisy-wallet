<script lang="ts">
	import { isNullish, notEmptyString } from '@dfinity/utils';
	import { onMount, tick } from 'svelte';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import ReceiveTestNetworkBadge from '$lib/components/receive/ReceiveTestNetworkBadge.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import InputSearch from '$lib/components/ui/InputSearch.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import {
		RECEIVE_TOKEN_IMPORT_BUTTON,
		RECEIVE_TOKEN_LIST,
		RECEIVE_TOKEN_LIST_ITEM
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ReceiveAsset } from '$lib/types/receive';
	import { isDesktop } from '$lib/utils/device.utils';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getTokenIdentifier } from '$lib/utils/identifier.utils';
	import { isReceiveTestToken } from '$lib/utils/receive.utils';
	import { getTokenDisplayName, getTokenDisplaySymbol } from '$lib/utils/token.utils';
	import { filterTokens } from '$lib/utils/tokens.utils';

	interface Props {
		assets: ReceiveAsset[];
		filter: string;
		selectedKey?: string;
		// Shown after another step: focus goes to the entry picked before, else to the search. When it
		// is the first step, the modal keeps focus, so a phone does not open its keyboard on the search.
		autofocus: boolean;
		onSelect: (asset: ReceiveAsset) => void;
		onImport: () => void;
		onClose: () => void;
	}

	let {
		assets,
		filter = $bindable(),
		selectedKey,
		autofocus,
		onSelect,
		onImport,
		onClose
	}: Props = $props();

	let buttons = $state<Record<string, HTMLButtonElement | undefined>>({});

	onMount(async () => {
		if (!autofocus || isNullish(selectedKey)) {
			return;
		}

		await tick();
		buttons[selectedKey]?.focus({ preventScroll: true });
	});

	// An entry matches when any of its versions does, by name, symbol, or contract, mint or ledger.
	let displayAssets = $derived(
		notEmptyString(filter.trim())
			? assets.filter(({ tokens }) => filterTokens({ tokens, filter }).length > 0)
			: assets
	);

	// Entries that share a symbol get the network and identifier, so two "USDC" read apart.
	let ambiguousSymbols = $derived(
		displayAssets.reduce<Map<string, number>>((acc, { token }) => {
			const symbol = getTokenDisplaySymbol(token);
			acc.set(symbol, (acc.get(symbol) ?? 0) + 1);
			return acc;
		}, new Map())
	);

	const identifierLabel = ({ token }: ReceiveAsset): string | undefined => {
		const identifier = getTokenIdentifier(token);

		return notEmptyString(identifier)
			? shortenWithMiddleEllipsis({ text: identifier, splitLength: 6 })
			: undefined;
	};
</script>

<div data-tid={RECEIVE_TOKEN_LIST}>
	<div class="input-field condensed mb-3 flex-1">
		<InputSearch
			autofocus={isDesktop() || (autofocus && isNullish(selectedKey))}
			placeholder={$i18n.tokens.placeholder.search_token}
			showResetButton={notEmptyString(filter)}
			bind:filter
		/>
	</div>
</div>

<div class="my-4 flex flex-col overflow-y-hidden sm:max-h-[26rem]">
	<div class="overflow-y-auto overscroll-contain">
		{#if displayAssets.length === 0}
			<div class="flex flex-col items-center gap-3 px-4 py-8 text-center">
				<p class="text-primary">{$i18n.receive.token.text.no_match}</p>

				<Button
					colorStyle="secondary-light"
					onclick={onImport}
					paddingSmall
					testId={RECEIVE_TOKEN_IMPORT_BUTTON}
				>
					{$i18n.receive.token.text.import_token}
				</Button>
			</div>
		{:else}
			<List noPadding>
				{#each displayAssets as asset (asset.key)}
					{@const { token, tokens } = asset}
					{@const grouped = tokens.length > 1}
					{@const ambiguous = (ambiguousSymbols.get(getTokenDisplaySymbol(token)) ?? 0) > 1}
					<ListItem styleClass="first-of-type:border-t-1">
						<LogoButton
							dividers
							fullWidth
							onClick={() => onSelect(asset)}
							selected={selectedKey === asset.key ? true : undefined}
							testId={`${RECEIVE_TOKEN_LIST_ITEM}-${asset.key}`}
							bind:button={buttons[asset.key]}
						>
							{#snippet logo()}
								<div class="mr-2">
									<TokenLogo
										badge={grouped ? undefined : { type: 'network' }}
										color="white"
										data={token}
										logoSize="lg"
									/>
								</div>
							{/snippet}

							{#snippet title()}
								{getTokenDisplaySymbol(token)}
							{/snippet}

							{#snippet subtitle()}
								{getTokenDisplayName(token)}
							{/snippet}

							{#snippet description()}
								{#if grouped}
									{replacePlaceholders($i18n.receive.token.text.networks_count, {
										$count: `${tokens.length}`
									})}
								{:else}
									{token.network.name}{#if ambiguous && identifierLabel(asset)}
										&middot; {identifierLabel(asset)}{/if}
								{/if}
							{/snippet}

							{#snippet descriptionEnd()}
								{#if !grouped && isReceiveTestToken(token)}
									<ReceiveTestNetworkBadge />
								{/if}
							{/snippet}
						</LogoButton>
					</ListItem>
				{/each}
			</List>
		{/if}
	</div>
</div>

<ButtonGroup>
	<ButtonCancel onclick={onClose} />
</ButtonGroup>
