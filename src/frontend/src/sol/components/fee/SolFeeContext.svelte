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
		SOLANA_LAMPORTS_PER_SIGNATURE,
		SOLANA_SEND_REQUIRED_SIGNATURES
	} from '$sol/constants/sol.constants';
	import { SOL_FEE_CONTEXT_KEY, type FeeContext } from '$sol/stores/sol-fee.store';
	import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';
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

	// Bumped on every token change and on destroy, so an estimate still in flight from before can
	// tell that the stores are no longer its to write.
	let generation = 0;

	const estimateFee = async (id: number) => {
		if (!observe || isNullish(token)) {
			return;
		}

		// Not `safeMapNetworkIdToNetwork`: the swap passes its source token straight through, so for a
		// moment after a token on another chain is picked this context is still mounted on it.
		const solNetwork = mapNetworkIdToNetwork(token.network.id);

		if (isNullish(solNetwork)) {
			return;
		}

		const addresses = isTokenSpl(token) ? [token.address] : undefined;

		try {
			const priorityFee = await estimatePriorityFee({ network: solNetwork, addresses });

			if (id !== generation) {
				return;
			}

			const fee =
				SOLANA_LAMPORTS_PER_SIGNATURE * BigInt(SOLANA_SEND_REQUIRED_SIGNATURES) +
				priorityFee / MICROLAMPORTS_PER_LAMPORT;
			feeStore.setFee(fee);
			prioritizationFeeStore.setFee(priorityFee);
		} catch (_: unknown) {
			// The poller is the retry, so a failed estimate publishes nothing and the last one stands
			// until a later poll succeeds, rather than surfacing as an unhandled rejection every tick.
		}
	};

	let timer: NodeJS.Timeout | undefined;

	const clearTimer = () => clearInterval(timer);

	const updateFee = (id: number) => {
		clearTimer();

		// Installed before the first estimate rather than once it resolves: a token change or destroy
		// while that request is pending then always finds this timer to clear, instead of the request
		// installing one after the clear has already run.
		timer = setInterval(() => void estimateFee(id), 5000);

		void estimateFee(id);
	};

	$effect(() => {
		[token];

		untrack(() => updateFee(++generation));
	});

	onDestroy(() => {
		generation++;
		clearTimer();
	});

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
