<script lang="ts">
	import { assertNonNullish, nonNullish } from '@dfinity/utils';
	import { getContext, onDestroy } from 'svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
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
	import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';
	import { isTokenSpl } from '$sol/utils/spl.utils';
	import { isAtaAddress } from '$sol/utils/sol-address.utils';

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

	const updateAtaFee = async () => {
		if (isNullishOrEmpty(destination) || !isTokenSpl($sendToken)) {
			ataFeeStore.setFee(undefined);
			return;
		}

		const solNetwork = mapNetworkIdToNetwork($sendTokenNetworkId);

		assertNonNullish(
			solNetwork,
			replacePlaceholders($i18n.init.error.no_solana_network, {
				$network: $sendTokenNetworkId.description ?? ''
			})
		);

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

	$: destination, $sendToken, updateAtaFee();
</script>

<slot />
