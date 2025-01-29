<script lang="ts">
	import { assertNonNullish } from '@dfinity/utils';
	import { getContext, onDestroy } from 'svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { estimatePriorityFee } from '$sol/api/solana.api';
	import {
		MICROLAMPORTS_PER_LAMPORT,
		SOLANA_TRANSACTION_FEE_IN_LAMPORTS
	} from '$sol/constants/sol.constants';
	import { SOL_FEE_CONTEXT_KEY, type FeeContext } from '$sol/stores/sol-fee.store';
	import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';
	import { isTokenSpl } from '$sol/utils/spl.utils';

	export let observe: boolean;

	const { feeStore, prioritizationFeeStore }: FeeContext =
		getContext<FeeContext>(SOL_FEE_CONTEXT_KEY);

	const { sendToken, sendTokenNetworkId } = getContext<SendContext>(SEND_CONTEXT_KEY);

	const estimateFee = async () => {
		// In case we are already sending, we don't want to update the fee
		if (!observe) {
			return;
		}

		const solNetwork = mapNetworkIdToNetwork($sendTokenNetworkId);

		assertNonNullish(
			solNetwork,
			replacePlaceholders($i18n.init.error.no_solana_network, {
				$network: $sendTokenNetworkId.description ?? ''
			})
		);

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

	$: $sendTokenNetworkId, (async () => await updateFee())();

	let timer: NodeJS.Timeout | undefined;

	const clearTimer = () => clearInterval(timer);

	onDestroy(clearTimer);
</script>

<slot />
