<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { NavigationTarget } from '@sveltejs/kit';
	import { afterNavigate, goto } from '$app/navigation';
	import { EARNING_ENABLED } from '$env/earning';
	import { ETHEREUM_TOKEN_ID } from '$env/tokens/tokens.eth.env';
	import HarvestAutopilotVaultInfo from '$eth/components/stake/harvest-autopilot/HarvestAutopilotVaultInfo.svelte';
	import { erc20Tokens } from '$eth/derived/erc20.derived';
	import {
		enabledHarvestAutopilotsUsdBalance,
		harvestAutopilots
	} from '$eth/derived/harvest-autopilots.derived';
	import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
	import { getHarvestAutopilotVaultTransactions } from '$eth/utils/harvest-autopilots.utils';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import { toCkMinterInfoAddresses } from '$icp-eth/utils/cketh.utils';
	import EarningPositionCard from '$lib/components/earning/EarningPositionCard.svelte';
	import EarningPotentialCard from '$lib/components/earning/EarningPotentialCard.svelte';
	import GetTokenModal from '$lib/components/get-token/GetTokenModal.svelte';
	import IconBackArrow from '$lib/components/icons/lucide/IconBackArrow.svelte';
	import StakeProviderContainer from '$lib/components/stake/StakeProviderContainer.svelte';
	import StakeTransactions from '$lib/components/stake/StakeTransactions.svelte';
	import SwapContexts from '$lib/components/swap/SwapContexts.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import ButtonWithModal from '$lib/components/ui/ButtonWithModal.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { modalGetToken } from '$lib/derived/modal.derived';
	import { routeAutopilotVault } from '$lib/derived/nav.derived';
	import { networkId } from '$lib/derived/network.derived';
	import { enabledMainnetFungibleTokensUsdBalance } from '$lib/derived/tokens-ui.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { StakingTransactionsUiWithToken } from '$lib/types/transaction-ui';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { networkUrl } from '$lib/utils/nav.utils';

	let fromRoute = $state<NavigationTarget | null>(null);

	afterNavigate(({ from }) => {
		fromRoute = from;
	});

	let vault = $derived(
		$harvestAutopilots.find(({ token: { address } }) => address === $routeAutopilotVault)
	);

	let assetToken = $derived(
		$erc20Tokens.find(({ address }) => address === vault?.token.assetAddress)
	);

	let availableBalance = $derived(
		nonNullish($enabledMainnetFungibleTokensUsdBalance)
			? $enabledMainnetFungibleTokensUsdBalance - $enabledHarvestAutopilotsUsdBalance
			: 0
	);

	let ckMinterInfoAddresses = $derived(
		toCkMinterInfoAddresses($ckEthMinterInfoStore?.[ETHEREUM_TOKEN_ID])
	);

	let transactions: StakingTransactionsUiWithToken[] = $derived(
		getHarvestAutopilotVaultTransactions({
			vault,
			ethTransactionsStore: $ethTransactionsStore,
			ethAddress: $ethAddress,
			ckMinterInfoAddresses
		})
	);

	let highestEarningPotentialUsd = $derived(
		nonNullish(vault?.apy) ? (availableBalance * Number(vault.apy)) / 100 : 0
	);

	let earningYearlyAmountUsd = $derived(
		nonNullish(vault?.token?.usdBalance) ? vault.token.usdBalance : 0
	);

	let earningPositionsUsd = $derived(
		nonNullish(vault?.apy) ? earningYearlyAmountUsd * (Number(vault.apy) / 100) : 0
	);
</script>

<div class="flex flex-col gap-6 pb-6">
	<StakeProviderContainer
		logo={vault?.token.assetIcon ?? vault?.token.icon}
		maxApy={nonNullish(vault?.apy) ? Number(vault.apy) : 0}
		pageDescription={$i18n.stake.text.harvest_autopilot_vault_page_description}
		pageTitle={vault?.token.name ?? ''}
	>
		{#snippet backButton()}
			{#if EARNING_ENABLED}
				<ButtonIcon
					ariaLabel="icon"
					colorStyle="tertiary"
					link={false}
					onclick={() =>
						goto(
							networkUrl({
								path: AppPath.EarnAutopilot,
								networkId: $networkId,
								usePreviousRoute: true,
								fromRoute
							})
						)}
				>
					{#snippet icon()}
						<IconBackArrow />
					{/snippet}
				</ButtonIcon>
			{/if}
		{/snippet}

		{#snippet content()}
			<div class="mt-6 flex flex-col justify-between gap-4 sm:flex-row">
				<EarningPotentialCard {availableBalance} {highestEarningPotentialUsd}>
					{#snippet buttons()}
						{#if nonNullish(assetToken)}
							<ButtonWithModal isOpen={$modalGetToken} onOpen={modalStore.openGetToken}>
								{#snippet button(onclick)}
									<Button fullWidth {onclick}>
										{replacePlaceholders($i18n.stake.text.get_asset_tokens, {
											$token_symbol: assetToken.symbol
										})}
									</Button>
								{/snippet}

								{#snippet modal()}
									{#if nonNullish($ethAddress)}
										<SwapContexts>
											<GetTokenModal
												{availableBalance}
												currentApy={Number(vault?.apy ?? 0)}
												receiveAddress={$ethAddress}
												token={assetToken}
											/>
										</SwapContexts>
									{/if}
								{/snippet}
							</ButtonWithModal>
						{/if}
					{/snippet}
				</EarningPotentialCard>

				<EarningPositionCard {earningPositionsUsd} {earningYearlyAmountUsd} />
			</div>
		{/snippet}
	</StakeProviderContainer>

	<StakeTransactions {transactions} />

	{#if nonNullish(vault)}
		<HarvestAutopilotVaultInfo {vault} />
	{/if}
</div>
