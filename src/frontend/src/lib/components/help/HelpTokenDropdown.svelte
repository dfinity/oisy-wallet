<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { IcToken } from '$icp/types/ic-token';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import IconCheck from '$lib/components/icons/IconCheck.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Dropdown from '$lib/components/ui/Dropdown.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { getTokenDisplayName, getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		tokens: IcToken[];
		selected?: IcToken;
		ariaLabel: string;
		disabled?: boolean;
		testId: string;
		onSelect: (token: IcToken) => void;
	}

	let { tokens, selected, ariaLabel, disabled = false, testId, onSelect }: Props = $props();

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

	const sortedTokens = $derived(
		[...uniqueTokens].sort((a, b) =>
			getTokenDisplaySymbol(a).localeCompare(getTokenDisplaySymbol(b))
		)
	);

	// A custom ledger is free to claim any symbol, so the symbol alone - which used to be an
	// option's whole visible and accessible label - cannot identify a ledger. Name the token as
	// well, as `ModalTokensListItem` does, and fall back to the ledger id where an impersonating
	// token matches on both, since that is the only field it cannot copy.
	const options = $derived(
		sortedTokens.map((token) => {
			const symbol = getTokenDisplaySymbol(token);
			const name = getTokenDisplayName(token);

			const ambiguous =
				sortedTokens.filter(
					(other) => getTokenDisplaySymbol(other) === symbol && getTokenDisplayName(other) === name
				).length > 1;

			return {
				token,
				symbol,
				description: ambiguous
					? `${name} · ${shortenWithMiddleEllipsis({ text: token.ledgerCanisterId })}`
					: name
			};
		})
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
				{getTokenDisplaySymbol(selected)}
			</span>
		{:else}
			{$i18n.help.text.select_token}
		{/if}

		{#snippet title()}
			{ariaLabel}
		{/snippet}

		{#snippet items()}
			<List condensed noPadding testId={`${testId}-list`}>
				{#each options as { token, symbol, description } (token.ledgerCanisterId)}
					<ListItem>
						<Button
							alignLeft
							colorStyle="tertiary-alt"
							contentFullWidth
							fullWidth
							onclick={() => handleSelect(token)}
							paddingSmall
							styleClass="py-1 rounded-md font-normal text-primary underline-none pl-0.5 min-w-32"
							testId={`${testId}-option-${token.ledgerCanisterId}`}
							transparent
						>
							<span class="w-[20px] pt-0.75 text-brand-primary">
								{#if selected?.ledgerCanisterId === token.ledgerCanisterId}
									<IconCheck size="20" />
								{/if}
							</span>
							<span class="flex w-full min-w-0 flex-row items-center gap-2">
								<TokenLogo data={token} logoSize="xs" />
								<span class="flex min-w-0 flex-col">
									<span class="truncate">{symbol}</span>
									<span class="truncate text-xs text-tertiary">{description}</span>
								</span>
							</span>
						</Button>
					</ListItem>
				{/each}
			</List>
		{/snippet}
	</Dropdown>
</span>

<style lang="scss">
	:global .help-token-selector {
		button {
			font-weight: normal !important;
		}
		.wrapper {
			padding: var(--padding-1_25x) !important;
		}
	}
</style>
