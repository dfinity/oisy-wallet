<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, onDestroy, type Snippet, untrack } from 'svelte';
	import type { Token } from '$lib/types/token';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import {
		checkIfAccountExists,
		estimatePriorityFee,
		getSolCreateAccountFee,
		loadTokenAccount
	} from '$sol/api/solana.api';
	import {
		MICROLAMPORTS_PER_LAMPORT,
		SOLANA_TRANSACTION_FEE_IN_LAMPORTS
	} from '$sol/constants/sol.constants';
	import { SOL_FEE_CONTEXT_KEY, type FeeContext } from '$sol/stores/sol-fee.store';
	import { safeMapNetworkIdToNetwork } from '$sol/utils/safe-network.utils';
	import { isAtaAddress } from '$sol/utils/sol-address.utils';
	import { isTokenSpl } from '$sol/utils/spl.utils';

	interface Props {
		token: Token;
		observe: boolean;
		destination?: string;
		children: Snippet;
	}

	let { token, observe, destination = '', children }: Props = $props();

	const { feeStore, prioritizationFeeStore, ataFeeStore }: FeeContext =
		getContext<FeeContext>(SOL_FEE_CONTEXT_KEY);

	const estimateFee = async () => {
		if (!observe || isNullish(token)) {
			return;
		}

		const solNetwork = safeMapNetworkIdToNetwork(token.network.id);

		const addresses = isTokenSpl(token) ? [token.address] : undefined;
		const priorityFee = await estimatePriorityFee({ network: solNetwork, addresses });
		const fee = SOLANA_TRANSACTION_FEE_IN_LAMPORTS + priorityFee / MICROLAMPORTS_PER_LAMPORT;
		feeStore.setFee(fee);
		prioritizationFeeStore.setFee(priorityFee);
	};

	const updateFee = async () => {
		clearTimer();

		await estimateFee();

		timer = setInterval(estimateFee, 5000);
	};

	$effect(() => {
		[token];

		untrack(() => updateFee());
	});

	let timer = $state<NodeJS.Timeout | undefined>();

	const clearTimer = () => clearInterval(timer);

	onDestroy(clearTimer);

	const updateAtaFee = async () => {
		if (!isTokenSpl(token)) {
			ataFeeStore.setFee(undefined);
			return;
		}

		const solNetwork = safeMapNetworkIdToNetwork(token.network.id);

		if (isNullishOrEmpty(destination)) {
			const ataFee = await getSolCreateAccountFee(solNetwork);

			ataFeeStore.setFee(ataFee);

			return;
		}

		// we check if it is an ATA address and if it is not closed, if it isn't an ATA address or has been closed, we need to charge the ATA fee
		if (
			(await isAtaAddress({ address: destination, network: solNetwork })) &&
			(await checkIfAccountExists({ address: destination, network: solNetwork }))
		) {
			ataFeeStore.setFee(undefined);
			return;
		}

		const tokenAccount = await loadTokenAccount({
			address: destination,
			network: solNetwork,
			tokenAddress: token.address
		});

		if (nonNullish(tokenAccount)) {
			ataFeeStore.setFee(undefined);
			return;
		}

		const ataFee = await getSolCreateAccountFee(solNetwork);

		ataFeeStore.setFee(ataFee);
	};

	$effect(() => {
		[destination, token];

		untrack(() => updateAtaFee());
	});
</script>

{@render children()}
