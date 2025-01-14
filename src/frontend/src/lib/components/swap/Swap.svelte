<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { setContext } from 'svelte';
	import { ICRC_CK_TOKENS_LEDGER_CANISTER_IDS } from '$env/networks/networks.icrc.env';
	import type { Erc20ContractAddress, Erc20Token } from '$eth/types/erc20';
	import { balance } from '$icp/api/icrc-ledger.api';
	import type { LedgerCanisterIdText } from '$icp/types/canister';
	import type { IcCkToken } from '$icp/types/ic-token';
	import SwapButtonWithModal from '$lib/components/swap/SwapButtonWithModal.svelte';
	import SwapModal from '$lib/components/swap/SwapModal.svelte';
	import { allDisabledIcrcTokens } from '$lib/derived/all-tokens.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { modalSwap } from '$lib/derived/modal.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { exchangeRateERC20ToUsd, exchangeRateICRCToUsd } from '$lib/services/exchange.services';
	import { balancesStore } from '$lib/stores/balances.store';
	import { exchangeStore } from '$lib/stores/exchange.store';
	import { modalStore } from '$lib/stores/modal.store';
	import {
		initSwapAmountsStore,
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';

	setContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY, {
		store: initSwapAmountsStore()
	});

	const onOpenSwap = async (tokenId: symbol) => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		modalStore.openSwap(tokenId);

		const loadDisabledIcrcTokensBalances = (): Promise<void[]> =>
			Promise.all(
				$allDisabledIcrcTokens.map(async ({ ledgerCanisterId, id }) => {
					const icrcTokenBalance = await balance({
						identity: $authIdentity,
						owner: $authIdentity.getPrincipal(),
						ledgerCanisterId
					});

					balancesStore.set({
						tokenId: id,
						data: {
							data: BigNumber.from(icrcTokenBalance),
							certified: true
						}
					});
				})
			);

		const loadDisabledIcrcTokensExchanges = async (): Promise<void> => {
			const [currentErc20Prices, currentIcrcPrices] = await Promise.all([
				exchangeRateERC20ToUsd(
					$allDisabledIcrcTokens.reduce<Erc20ContractAddress[]>((acc, token) => {
						const twinTokenAddress = (
							(token as Partial<IcCkToken>).twinToken as Erc20Token | undefined
						)?.address;

						return nonNullish(twinTokenAddress)
							? [
									...acc,
									{
										address: twinTokenAddress
									}
								]
							: acc;
					}, [])
				),
				exchangeRateICRCToUsd(
					$allDisabledIcrcTokens.reduce<LedgerCanisterIdText[]>(
						(acc, { ledgerCanisterId }) =>
							!ICRC_CK_TOKENS_LEDGER_CANISTER_IDS.includes(ledgerCanisterId)
								? [...acc, ledgerCanisterId]
								: acc,
						[]
					)
				)
			]);

			exchangeStore.set([
				...(nonNullish(currentErc20Prices) ? [currentErc20Prices] : []),
				...(nonNullish(currentIcrcPrices) ? [currentIcrcPrices] : [])
			]);
		};

		await loadDisabledIcrcTokensBalances();
		await loadDisabledIcrcTokensExchanges();
	};
</script>

<SwapButtonWithModal open={onOpenSwap} isOpen={$modalSwap}>
	<SwapModal on:nnsClose />
</SwapButtonWithModal>
