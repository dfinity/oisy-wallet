<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext, onDestroy } from 'svelte';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
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

	export let observe: boolean;
	export let destination = '';

	const { feeStore, prioritizationFeeStore, ataFeeStore }: FeeContext =
		getContext<FeeContext>(SOL_FEE_CONTEXT_KEY);

	const { sendToken, sendTokenNetworkId } = getContext<SendContext>(SEND_CONTEXT_KEY);

	const estimateFee = async () => {
		// In case we are already sending, we don't want to update the fee
		if (!observe) {
			return;
		}

		const solNetwork = safeMapNetworkIdToNetwork($sendTokenNetworkId);

		const addresses = isTokenSpl($sendToken) ? [$sendToken.address] : undefined;
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

	$: ($sendTokenNetworkId, (async () => await updateFee())());

	let timer: NodeJS.Timeout | undefined;

	const clearTimer = () => clearInterval(timer);

	onDestroy(clearTimer);

	const updateAtaFee = async () => {
		if (isNullishOrEmpty(destination) || !isTokenSpl($sendToken)) {
			ataFeeStore.setFee(undefined);
			return;
		}

		const solNetwork = safeMapNetworkIdToNetwork($sendTokenNetworkId);

		// we check if it is an ATA address and if it is not closed, if it isnt an ATA address or has been closed we need to charge the ATA fee
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
			tokenAddress: $sendToken.address
		});

		if (nonNullish(tokenAccount)) {
			ataFeeStore.setFee(undefined);
			return;
		}

		const ataFee = await getSolCreateAccountFee(solNetwork);

		ataFeeStore.setFee(ataFee);
	};

	$: (destination, $sendToken, updateAtaFee());
</script>

<slot />
