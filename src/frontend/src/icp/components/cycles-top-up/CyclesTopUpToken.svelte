<script lang="ts">
	import type { IcToken } from '$icp/types/ic-token';
	import ModalTokensListItem from '$lib/components/tokens/ModalTokensListItem.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import {
		CYCLES_TOP_UP_TOKEN,
		CYCLES_TOP_UP_TOKEN_OPTION
	} from '$lib/constants/test-ids.constants';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { stakeBalances } from '$lib/derived/stake.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { mapTokenUi } from '$lib/utils/token.utils';

	interface Props {
		// The tokens that can pay for a top-up (`isCyclesTopUpTokenUsable`). Without any, the
		// step explains what a top-up is and how to pay for one, and goes no further.
		tokens: IcToken[];
		onSelect: (token: IcToken) => void;
		onCancel: () => void;
	}

	let { tokens, onSelect, onCancel }: Props = $props();

	// With their balances and values, as the other token lists show them.
	let options = $derived(
		tokens.map((token) => ({
			token,
			tokenUi: mapTokenUi({
				token,
				$balances: $balancesStore,
				$stakeBalances,
				$exchanges
			})
		}))
	);
</script>

<ContentWithToolbar testId={CYCLES_TOP_UP_TOKEN}>
	{#if options.length > 0}
		<p class="mb-4 text-sm text-tertiary">{$i18n.cycles_top_up.text.pay_with}</p>

		<ul class="flex list-none flex-col">
			{#each options as { token, tokenUi } (token.id)}
				<li data-tid={CYCLES_TOP_UP_TOKEN_OPTION}>
					<ModalTokensListItem onClick={() => onSelect(token)} token={tokenUi} />
				</li>
			{/each}
		</ul>
	{:else}
		<EmptyState
			description={$i18n.cycles_top_up.text.no_token_description}
			title={$i18n.cycles_top_up.text.no_token_title}
		/>
	{/if}

	{#snippet toolbar()}
		{#if options.length > 0}
			<ButtonCancel fullWidth onclick={onCancel} />
		{:else}
			<Button fullWidth onclick={onCancel}>{$i18n.core.text.close}</Button>
		{/if}
	{/snippet}
</ContentWithToolbar>
