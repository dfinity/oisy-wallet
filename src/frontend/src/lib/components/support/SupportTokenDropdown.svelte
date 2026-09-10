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

	interface Props {
		tokens: IcToken[];
		selected?: IcToken;
		ariaLabel: string;
		testId: string;
		onSelect: (token: IcToken) => void;
	}

	let { tokens, selected, ariaLabel, testId, onSelect }: Props = $props();

	let dropdown = $state<Dropdown>();

	const handleSelect = (token: IcToken) => {
		dropdown?.close();
		onSelect(token);
	};

	// Two tokens can share a symbol, so the ledger canister id is the stable key and the value
	// that disambiguates the button label is left to the symbol the user already recognises.
	const sortedTokens = $derived([...tokens].sort((a, b) => a.symbol.localeCompare(b.symbol)));
</script>

<span class="support-token-selector min-w-36">
	<Dropdown
		bind:this={dropdown}
		{ariaLabel}
		asModalOnMobile
		buttonBorder
		buttonFullWidth
		disabled={tokens.length === 0}
		{testId}
	>
		{#if nonNullish(selected)}
			<span class="flex items-center gap-2">
				<TokenLogo data={selected} logoSize="xs" />
				{selected.symbol}
			</span>
		{:else}
			{$i18n.support.text.select_token}
		{/if}

		{#snippet title()}
			{ariaLabel}
		{/snippet}

		{#snippet items()}
			{#if sortedTokens.length === 0}
				<p class="p-3 text-sm text-tertiary" data-tid={`${testId}-empty`}>
					{$i18n.support.text.no_tokens}
				</p>
			{:else}
				<List condensed noPadding testId={`${testId}-list`}>
					{#each sortedTokens as token (token.ledgerCanisterId)}
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
								<span class="flex w-full flex-row items-center gap-2">
									<TokenLogo data={token} logoSize="xs" />
									<span>{token.symbol}</span>
								</span>
							</Button>
						</ListItem>
					{/each}
				</List>
			{/if}
		{/snippet}
	</Dropdown>
</span>

<style lang="scss">
	:global .support-token-selector {
		button {
			font-weight: normal !important;
		}
		.wrapper {
			padding: var(--padding-1_25x) !important;
		}
	}
</style>
