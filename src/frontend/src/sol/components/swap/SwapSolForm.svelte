<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, onDestroy, untrack } from 'svelte';
	import {
		SOLANA_DEVNET_TOKEN,
		SOLANA_LOCAL_TOKEN,
		SOLANA_TOKEN
	} from '$env/tokens/tokens.sol.env';
	import SwapForm from '$lib/components/swap/SwapForm.svelte';
	import SwapProvider from '$lib/components/swap/SwapProvider.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { balancesStore } from '$lib/stores/balances.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { TokenActionErrorType } from '$lib/types/token-action';
	import { formatToken } from '$lib/utils/format.utils';
	import { isNetworkIdSOLDevnet, isNetworkIdSOLLocal } from '$lib/utils/network.utils';
	import { parseToken } from '$lib/utils/parse.utils';
	import { estimatePriorityFee, getSolCreateAccountFee } from '$sol/api/solana.api';
	import {
		MICROLAMPORTS_PER_LAMPORT,
		SOLANA_TRANSACTION_FEE_IN_LAMPORTS
	} from '$sol/constants/sol.constants';
	import { initFeeStore } from '$sol/stores/sol-fee.store';
	import { safeMapNetworkIdToNetwork } from '$sol/utils/safe-network.utils';
	import { isTokenSpl } from '$sol/utils/spl.utils';

	interface Props {
		swapAmount: OptionAmount;
		receiveAmount?: number;
		slippageValue: OptionAmount;
		networkFee?: bigint;
		ataFee?: bigint;
		isSwapAmountsLoading: boolean;
		onShowTokensList: (tokenSource: 'source' | 'destination') => void;
		onShowProviderList: () => void;
		onClose: () => void;
		onNext: () => void;
	}

	let {
		swapAmount = $bindable(),
		receiveAmount = $bindable(),
		slippageValue = $bindable(),
		networkFee = $bindable(),
		ataFee = $bindable(),
		isSwapAmountsLoading,
		onShowTokensList,
		onShowProviderList,
		onClose,
		onNext
	}: Props = $props();

	const { sourceToken, destinationToken, sourceTokenBalance } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

	let errorType = $state<TokenActionErrorType | undefined>();

	const feeStore = initFeeStore();
	const ataFeeStore = initFeeStore();

	let feeTimer = $state<ReturnType<typeof setInterval> | undefined>();

	const clearFeeTimer = () => {
		if (nonNullish(feeTimer)) {
			clearInterval(feeTimer);
			feeTimer = undefined;
		}
	};

	const estimateSolFee = async () => {
		if (isNullish($sourceToken)) {
			return;
		}

		const solNetwork = safeMapNetworkIdToNetwork($sourceToken.network.id);
		const addresses = isTokenSpl($sourceToken) ? [$sourceToken.address] : undefined;
		const priorityFee = await estimatePriorityFee({ network: solNetwork, addresses });
		const fee = SOLANA_TRANSACTION_FEE_IN_LAMPORTS + priorityFee / MICROLAMPORTS_PER_LAMPORT;
		feeStore.setFee(fee);
	};

	const estimateAtaFee = async () => {
		if (isNullish($sourceToken) || !isTokenSpl($sourceToken)) {
			ataFeeStore.setFee(undefined);

			return;
		}

		const solNetwork = safeMapNetworkIdToNetwork($sourceToken.network.id);

		const ataFee = await getSolCreateAccountFee(solNetwork);

		ataFeeStore.setFee(ataFee);
	};

	$effect(() => {
		[$sourceToken];

		untrack(() => {
			clearFeeTimer();
			estimateSolFee();
			feeTimer = setInterval(estimateSolFee, 5000);
		});
	});

	$effect(() => {
		[$sourceToken];

		untrack(() => estimateAtaFee());
	});

	onDestroy(clearFeeTimer);

	$effect(() => {
		networkFee = $feeStore;
	});

	$effect(() => {
		ataFee = $ataFeeStore;
	});

	let solanaNativeToken = $derived(
		isNetworkIdSOLDevnet($sourceToken?.network.id)
			? SOLANA_DEVNET_TOKEN
			: isNetworkIdSOLLocal($sourceToken?.network.id)
				? SOLANA_LOCAL_TOKEN
				: SOLANA_TOKEN
	);

	const customValidate = (userAmount: bigint): TokenActionErrorType | undefined => {
		if (isNullish($sourceToken)) {
			return;
		}

		const parsedSendBalance = nonNullish($sourceTokenBalance)
			? parseToken({
					value: formatToken({
						value: $sourceTokenBalance,
						unitName: $sourceToken.decimals,
						displayDecimals: $sourceToken.decimals
					}),
					unitName: $sourceToken.decimals
				})
			: ZERO;

		if (userAmount > parsedSendBalance) {
			return 'insufficient-funds';
		}

		if (!isTokenSpl($sourceToken) && nonNullish($feeStore)) {
			if (userAmount + $feeStore > parsedSendBalance) {
				return 'insufficient-funds-for-fee';
			}
		}

		if (isTokenSpl($sourceToken) && nonNullish($feeStore)) {
			const solBalance = $balancesStore?.[solanaNativeToken.id]?.data ?? ZERO;

			const totalFee = $feeStore + ($ataFeeStore ?? ZERO);

			if (solBalance < totalFee) {
				return 'insufficient-funds-for-fee';
			}
		}
	};

	$effect(() => {
		if (nonNullish($sourceToken) && nonNullish(swapAmount)) {
			const parsedAmount = parseToken({
				value: `${swapAmount}`,
				unitName: $sourceToken.decimals
			});

			const newErrorType = customValidate(parsedAmount);
			if (newErrorType !== errorType) {
				errorType = newErrorType;
			}
		}
	});
</script>

<SwapForm
	{errorType}
	fee={$feeStore}
	{isSwapAmountsLoading}
	{onClose}
	onCustomValidate={customValidate}
	{onNext}
	{onShowTokensList}
	bind:swapAmount
	bind:receiveAmount
	bind:slippageValue
>
	{#snippet swapDetails()}
		{#if nonNullish($destinationToken) && nonNullish($sourceToken)}
			<Hr spacing="md" />

			<div class="flex flex-col gap-3">
				<SwapProvider {onShowProviderList} showSelectButton {slippageValue} />
			</div>
		{/if}
	{/snippet}
</SwapForm>
