<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, onDestroy, type Snippet, untrack } from 'svelte';
	import { get } from 'svelte/store';
	import type { Token, TokenId } from '$lib/types/token';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import {
		checkIfAccountExists,
		estimatePriorityFee,
		getSolCreateAccountFee,
		loadTokenAccount
	} from '$sol/api/solana.api';
	import { SOL_FEE_CONTEXT_KEY, type FeeContext } from '$sol/stores/sol-fee.store';
	import { calculateSolSendFee, getSolSendComputeUnitLimit } from '$sol/utils/fee.utils';
	import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';
	import { safeMapNetworkIdToNetwork } from '$sol/utils/safe-network.utils';
	import { isAtaAddress } from '$sol/utils/sol-address.utils';
	import { isTokenSpl } from '$sol/utils/spl.utils';

	interface Props {
		token: Token;
		observe: boolean;
		// Keeps the price already quoted for this token instead of refreshing it: an amount set by
		// "Max" holds back exactly the fee it comes to, and the transaction is signed with it.
		holdFee?: boolean;
		destination?: string;
		children: Snippet;
	}

	let { token, observe, holdFee = false, destination = '', children }: Props = $props();

	const { feeStore, prioritizationFeeStore, ataFeeStore }: FeeContext =
		getContext<FeeContext>(SOL_FEE_CONTEXT_KEY);

	// Bumped on every token change and on destroy, so an estimate still in flight from before can
	// tell that the stores are no longer its to write.
	let generation = 0;

	// The token the price in `prioritizationFeeStore` was estimated for: holding the fee keeps that
	// price, but a token that has none of its own yet still takes its first one. Kept by id, since
	// the same token arriving as a new object starts a new generation.
	let pricedTokenId: TokenId | undefined;

	// The fee is the price over the limit the transaction is signed with, which is larger when the
	// send opens the recipient's token account, so it is quoted again whenever either changes.
	const quoteFee = ({
		computeUnitPrice,
		createsTokenAccount
	}: {
		computeUnitPrice: bigint;
		createsTokenAccount: boolean;
	}) =>
		feeStore.setFee(
			calculateSolSendFee({
				computeUnitPrice,
				computeUnitLimit: getSolSendComputeUnitLimit({
					isSpl: isTokenSpl(token),
					createsTokenAccount
				})
			})
		);

	const estimateFee = async (id: number) => {
		if (!observe || isNullish(token)) {
			return;
		}

		// `token` can be any `Token`, so skip one that isn't on a Solana network instead of throwing.
		const solNetwork = mapNetworkIdToNetwork(token.network.id);

		if (isNullish(solNetwork)) {
			return;
		}

		const addresses = isTokenSpl(token) ? [token.address] : undefined;

		try {
			const computeUnitPrice = await estimatePriorityFee({ network: solNetwork, addresses });

			// Read once the estimate is back, since "Max" can be pressed while it is in flight.
			if (id !== generation || (holdFee && pricedTokenId === token.id)) {
				return;
			}

			pricedTokenId = token.id;

			quoteFee({ computeUnitPrice, createsTokenAccount: nonNullish(get(ataFeeStore)) });
			prioritizationFeeStore.setFee(computeUnitPrice);
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

	const setAtaFee = (ataFee: bigint | undefined) => {
		ataFeeStore.setFee(ataFee);

		const computeUnitPrice = get(prioritizationFeeStore);

		if (nonNullish(computeUnitPrice)) {
			quoteFee({ computeUnitPrice, createsTokenAccount: nonNullish(ataFee) });
		}
	};

	const updateAtaFee = async () => {
		if (!isTokenSpl(token)) {
			setAtaFee(undefined);
			return;
		}

		const solNetwork = safeMapNetworkIdToNetwork(token.network.id);

		if (isNullishOrEmpty(destination)) {
			const ataFee = await getSolCreateAccountFee(solNetwork);

			setAtaFee(ataFee);

			return;
		}

		// we check if it is an ATA address and if it is not closed, if it isn't an ATA address or has been closed, we need to charge the ATA fee
		if (
			(await isAtaAddress({ address: destination, network: solNetwork })) &&
			(await checkIfAccountExists({ address: destination, network: solNetwork }))
		) {
			setAtaFee(undefined);
			return;
		}

		const tokenAccount = await loadTokenAccount({
			address: destination,
			network: solNetwork,
			tokenAddress: token.address
		});

		if (nonNullish(tokenAccount)) {
			setAtaFee(undefined);
			return;
		}

		const ataFee = await getSolCreateAccountFee(solNetwork);

		setAtaFee(ataFee);
	};

	$effect(() => {
		[destination, token];

		untrack(() => updateAtaFee());
	});
</script>

{@render children()}
