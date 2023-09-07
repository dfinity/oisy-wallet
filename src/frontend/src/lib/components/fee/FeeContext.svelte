<script lang="ts">
	import type { WebSocketListener } from '$lib/types/listener';
	import { token } from '$lib/derived/token.derived';
	import { ETHEREUM_TOKEN_ID } from '$lib/constants/tokens.constants';
	import { getFeeData } from '$lib/providers/etherscan.providers';
	import { BigNumber } from '@ethersproject/bignumber';
	import { ETH_BASE_FEE } from '$lib/constants/eth.constants';
	import { getFeeData as getErc20FeeData } from '$lib/providers/etherscan-erc20.providers';
	import type { Erc20Token } from '$lib/types/erc20';
	import { addressStore } from '$lib/stores/address.store';
	import { Utils } from 'alchemy-sdk';
	import { toastsError } from '$lib/stores/toasts.store';
	import { debounce } from '@dfinity/utils';
	import { initMinedTransactionsListener } from '$lib/services/listener.services';
	import { getContext, onDestroy } from 'svelte';
	import { FEE_CONTEXT_KEY, type FeeContext } from '$lib/stores/fee.store';

	export let observe: boolean;
	export let destination = '';
	export let amount: string | number | undefined = undefined;

	const { store }: FeeContext = getContext<FeeContext>(FEE_CONTEXT_KEY);

	/**
	 * Updating and fetching fee
	 */

	let listener: WebSocketListener | undefined = undefined;

	const updateFeeData = async () => {
		try {
			if ($token.id === ETHEREUM_TOKEN_ID) {
				store.setFee({
					...(await getFeeData()),
					gas: BigNumber.from(ETH_BASE_FEE)
				});
				return;
			}

			store.setFee({
				...(await getFeeData()),
				gas: await getErc20FeeData({
					contract: $token as Erc20Token,
					address: destination !== '' ? destination : $addressStore!,
					amount: Utils.parseEther(`${amount ?? '1'}`)
				})
			});
		} catch (err: unknown) {
			toastsError({
				msg: { text: `Cannot fetch gas fee.` },
				err
			});
		}
	};

	const debounceUpdateFeeData = debounce(updateFeeData);

	const obverseFeeData = async (watch: boolean) => {
		await listener?.disconnect();

		if (!watch) {
			return;
		}

		await updateFeeData();
		listener = initMinedTransactionsListener(async () => debounceUpdateFeeData());
	};

	onDestroy(() => listener?.disconnect());

	/**
	 * Observe input properties for erc20
	 */

	$: obverseFeeData(observe);

	$: amount,
		destination,
		(() => {
			if ($token.id === ETHEREUM_TOKEN_ID) {
				return;
			}

			debounceUpdateFeeData();
		})();
</script>

<slot />
