<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { loadCustomTokens } from '$icp/services/icrc.services';
	import type { IcToken } from '$icp/types/ic-token';
	import { isCyclesTopUpTokenUsable } from '$icp/utils/cycles-top-up.utils';
	import { isTokenIcrcCustomToken } from '$icp/utils/icrc.utils';
	import { setCustomToken as setCustomIcrcToken } from '$icp-eth/services/icrc-token.services';
	import Divider from '$lib/components/common/Divider.svelte';
	import ModalTokensListItem from '$lib/components/tokens/ModalTokensListItem.svelte';
	import TokenBalance from '$lib/components/tokens/TokenBalance.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
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
						<!-- Laid out as the rows of the token lists, but not a button: it cannot be picked,
						     and Enable, when offered, sits in it where the balance would be. -->
						<div class="flex w-full px-2">
							<span
								class="flex w-full flex-row items-center justify-between border-b border-brand-subtle-20 py-3"
							>
								<span class="flex min-w-0 items-center">
									<span class="mr-4 flex">
										<TokenLogo
											badge={{ type: 'network' }}
											color="white"
											data={tokenUi}
											logoSize="lg"
										/>
									</span>

									<span class="flex min-w-0 flex-col text-left">
										<span class="flex min-w-0 items-center truncate text-nowrap">
											<span class="text-lg font-bold text-nowrap text-primary">
												{nonNullish(tokenUi.oisySymbol)
													? tokenUi.oisySymbol.oisySymbol
													: tokenUi.symbol}
											</span>

											<span class="text-tertiary"><Divider /></span>

											<span class="truncate text-base text-nowrap text-tertiary">
												{#if nonNullish(tokenUi.oisyName?.prefix)}
													{$i18n.tokens.text.chain_key}
												{/if}

												{getTokenDisplayName(tokenUi)}
											</span>
										</span>

										<span class="truncate text-sm text-tertiary">{tokenUi.network.name}</span>
									</span>
								</span>

								<span class="ml-2 flex shrink-0 items-center text-nowrap">
									{#if state === 'not_enabled'}
										<!-- The same button as Send's choice between sending and topping up. -->
										<Button
											ariaLabel={replacePlaceholders($i18n.cycles_top_up.alt.enable_token, {
												$token: token.symbol
											})}
											disabled={enabling}
											loading={enabling}
											onclick={() => enable(token)}
											paddingSmall
											styleClass="min-w-30 text-nowrap"
											testId={CYCLES_TOP_UP_TOKEN_ENABLE_BUTTON}
										>
											{$i18n.cycles_top_up.text.enable_token}
										</Button>
									{:else}
										<span class="flex flex-col text-right text-nowrap">
											<span class="ml-1 block min-w-12 text-lg font-bold text-nowrap">
												<TokenBalance data={tokenUi} />
											</span>

											{#if state === 'too_low'}
												<span class="text-sm text-nowrap text-tertiary">
													{$i18n.cycles_top_up.text.not_enough_to_pay}
												</span>
											{/if}
										</span>
									{/if}
								</span>
							</span>
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
