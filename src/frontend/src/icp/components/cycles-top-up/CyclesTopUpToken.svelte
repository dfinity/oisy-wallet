<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { loadCustomTokens } from '$icp/services/icrc.services';
	import type { IcToken } from '$icp/types/ic-token';
	import { isCyclesTopUpTokenUsable } from '$icp/utils/cycles-top-up.utils';
	import { isTokenIcrcCustomToken } from '$icp/utils/icrc.utils';
	import { setCustomToken as setCustomIcrcToken } from '$icp-eth/services/icrc-token.services';
	import ModalTokensListItem from '$lib/components/tokens/ModalTokensListItem.svelte';
	import TokenBalance from '$lib/components/tokens/TokenBalance.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import {
		CYCLES_TOP_UP_TOKEN,
		CYCLES_TOP_UP_TOKEN_ENABLE_BUTTON,
		CYCLES_TOP_UP_TOKEN_OPTION
	} from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { stakeBalances } from '$lib/derived/stake.derived';
	import { autoLoadSingleToken } from '$lib/services/token.services';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';
	import { getTokenDisplayName, mapTokenUi } from '$lib/utils/token.utils';

	interface Props {
		// ICP and, while topping up with TCYCLES is on, TCYCLES, enabled or not, so both ways to
		// pay are shown. A token can be picked when it can pay (`isCyclesTopUpTokenUsable`); one
		// that cannot is shown with why, and TCYCLES, while not enabled, offers Enable where its
		// balance would be. When none can pay, the step explains what a top-up is and how to pay
		// for one, and goes no further.
		tokens: IcToken[];
		onSelect: (token: IcToken) => void;
		onCancel: () => void;
	}

	let { tokens, onSelect, onCancel }: Props = $props();

	// A balance that has not loaded can neither pay nor tell that it is too low yet.
	type PayState = 'can_pay' | 'too_low' | 'loading' | 'not_enabled';

	let options = $derived(
		tokens.map((token) => {
			const balance = $balancesStore?.[token.id]?.data;

			const state: PayState =
				isTokenToggleable(token) && !token.enabled
					? 'not_enabled'
					: isNullish(balance)
						? 'loading'
						: isCyclesTopUpTokenUsable({ token, balance })
							? 'can_pay'
							: 'too_low';

			return {
				token,
				state,
				// With their balances and values, as the other token lists show them.
				tokenUi: mapTokenUi({
					token,
					$balances: $balancesStore,
					$stakeBalances,
					$exchanges
				})
			};
		})
	);

	let nonePays = $derived(
		options.every(({ state }) => state === 'too_low' || state === 'not_enabled')
	);

	let enabling = $state(false);

	// Saved to the user's tokens as the Swap does for a destination token; its balance then
	// loads, and the token can be picked once it can pay.
	const enable = async (token: IcToken) => {
		if (!isTokenIcrcCustomToken(token)) {
			return;
		}

		enabling = true;

		await autoLoadSingleToken({
			identity: $authIdentity,
			token,
			setToken: setCustomIcrcToken,
			loadTokens: loadCustomTokens,
			errorMessage: $i18n.init.error.icrc_custom_token
		});

		enabling = false;
	};
</script>

<ContentWithToolbar testId={CYCLES_TOP_UP_TOKEN}>
	{#if nonePays}
		<EmptyState
			description={$i18n.cycles_top_up.text.no_token_description}
			title={$i18n.cycles_top_up.text.no_token_title}
		/>
	{:else}
		<p class="mb-4 text-sm text-tertiary">{$i18n.cycles_top_up.text.pay_with}</p>

		<ul class="flex list-none flex-col">
			{#each options as { token, state, tokenUi } (token.id)}
				<li data-tid={CYCLES_TOP_UP_TOKEN_OPTION}>
					{#if state === 'can_pay'}
						<ModalTokensListItem onClick={() => onSelect(token)} token={tokenUi} />
					{:else}
						<div class="flex items-center">
							<!-- Shown but not picked: `inert` keeps the row out of clicks and the tab order. -->
							<div class="min-w-0 flex-1" inert>
								<LogoButton dividers fullWidth hover={false}>
									{#snippet title()}
										{nonNullish(tokenUi.oisySymbol)
											? tokenUi.oisySymbol.oisySymbol
											: tokenUi.symbol}
									{/snippet}

									{#snippet subtitle()}
										{#if nonNullish(tokenUi.oisyName?.prefix)}
											{$i18n.tokens.text.chain_key}
										{/if}

										{getTokenDisplayName(tokenUi)}
									{/snippet}

									{#snippet description()}
										{tokenUi.network.name}
									{/snippet}

									{#snippet logo()}
										<div class="mr-2">
											<TokenLogo
												badge={{ type: 'network' }}
												color="white"
												data={tokenUi}
												logoSize="lg"
											/>
										</div>
									{/snippet}

									{#snippet titleEnd()}
										{#if state !== 'not_enabled'}
											<div class="ml-1 min-w-12 text-nowrap">
												<TokenBalance data={tokenUi} />
											</div>
										{/if}
									{/snippet}

									{#snippet descriptionEnd()}
										{#if state === 'too_low'}
											{$i18n.cycles_top_up.text.not_enough_to_pay}
										{/if}
									{/snippet}
								</LogoButton>
							</div>

							{#if state === 'not_enabled'}
								<Button
									ariaLabel={replacePlaceholders($i18n.cycles_top_up.alt.enable_token, {
										$token: token.symbol
									})}
									disabled={enabling}
									link
									loading={enabling}
									onclick={() => enable(token)}
									testId={CYCLES_TOP_UP_TOKEN_ENABLE_BUTTON}
									>{$i18n.cycles_top_up.text.enable_token}</Button
								>
							{/if}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	{#snippet toolbar()}
		{#if nonePays}
			<Button fullWidth onclick={onCancel}>{$i18n.core.text.close}</Button>
		{:else}
			<ButtonCancel fullWidth onclick={onCancel} />
		{/if}
	{/snippet}
</ContentWithToolbar>
