<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { IcToken } from '$icp/types/ic-token';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import ListItemButton from '$lib/components/common/ListItemButton.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import Dropdown from '$lib/components/ui/Dropdown.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		buildIcTokenLabels,
		getTokenDisplayName,
		getTokenDisplaySymbol
	} from '$lib/utils/token.utils';

	interface Props {
		tokens: IcToken[];
		selected?: IcToken;
		// Labels built over the whole candidate set by the caller. This list is filtered - it
		// excludes the token picked on the other side - so labels derived from it alone could lose
		// an impostor's twin and present the impostor as unique.
		labels?: Map<string, string>;
		ariaLabel: string;
		disabled?: boolean;
		testId: string;
		onSelect: (token: IcToken) => void;
	}

	let { tokens, selected, labels, ariaLabel, disabled = false, testId, onSelect }: Props = $props();

	let dropdown = $state<Dropdown>();

	const handleSelect = (token: IcToken) => {
		dropdown?.close();
		onSelect(token);
	};

	// `enabledIcrcTokens` concatenates the enabled default tokens with the enabled custom ones, and
	// unlike `icrcTokens` it does not drop a custom token that duplicates a default. A token that is
	// both therefore arrives twice, which throws `each_key_duplicate` on the keyed each below and
	// leaves the panel empty. Deduplicate on the ledger canister id, keeping the first occurrence:
	// that is the default entry, which is the variant the rest of the app treats as authoritative.
	const uniqueTokens = $derived(
		tokens.filter(
			({ ledgerCanisterId }, index) =>
				tokens.findIndex((token) => token.ledgerCanisterId === ledgerCanisterId) === index
		)
	);

	const tokenLabels = $derived(labels ?? buildIcTokenLabels(uniqueTokens));

	const labelOf = (token: IcToken): string =>
		tokenLabels.get(token.ledgerCanisterId) ?? getTokenDisplaySymbol(token);

	// The label carries the ledger id wherever symbols collide, and the name sits under it, as in
	// `ModalTokensListItem`, so no option is left with the symbol as its whole label. Sorting by
	// label keeps twins adjacent, in a stable order.
	const options = $derived(
		uniqueTokens
			.map((token) => ({ token, label: labelOf(token), name: getTokenDisplayName(token) }))
			.sort((a, b) => a.label.localeCompare(b.label))
	);
</script>

<span class="help-token-selector min-w-36">
	<Dropdown
		bind:this={dropdown}
		{ariaLabel}
		asModalOnMobile
		buttonBorder
		buttonFullWidth
		disabled={disabled || tokens.length === 0}
		{testId}
	>
		{#if nonNullish(selected)}
			<span class="flex items-center gap-2">
				<TokenLogo data={selected} logoSize="xs" />
				{labelOf(selected)}
			</span>
		{:else}
			{$i18n.help.text.select_token}
		{/if}

		{#snippet title()}
			{ariaLabel}
		{/snippet}

		{#snippet items()}
			<div class="menu-surface">
				<List condensed noPadding testId={`${testId}-list`}>
					{#each options as { token, label, name } (token.ledgerCanisterId)}
						<ListItem>
							<ListItemButton
								contentFullWidth
								onclick={() => handleSelect(token)}
								selectable
								selected={selected?.ledgerCanisterId === token.ledgerCanisterId}
								testId={`${testId}-option-${token.ledgerCanisterId}`}
							>
								<span class="flex min-w-0 items-center gap-2">
									<TokenLogo data={token} logoSize="xs" />
									<span class="flex min-w-0 flex-col text-left">
										<span class="truncate">{label}</span>
										<span class="truncate text-xs text-tertiary">{name}</span>
									</span>
								</span>
							</ListItemButton>
						</ListItem>
					{/each}
				</List>
			</div>
		{/snippet}
	</Dropdown>
</span>
