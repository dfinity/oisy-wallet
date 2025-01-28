<script lang="ts">
	import { assertNonNullish, isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import { balance } from '$lib/derived/balances.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { token } from '$lib/stores/token.store';
	import type { OptionAmount } from '$lib/types/send';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { getSolCreateAccountFee, loadTokenAccount } from '$sol/api/solana.api';
	import SolFeeDisplay from '$sol/components/fee/SolFeeDisplay.svelte';
	import SolSendAmount from '$sol/components/send/SolSendAmount.svelte';
	import SolSendDestination from '$sol/components/send/SolSendDestination.svelte';
	import { type FeeContext, SOL_FEE_CONTEXT_KEY } from '$sol/stores/sol-fee.store';
	import type { SolAmountAssertionError } from '$sol/types/sol-send';
	import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';
	import { isTokenSpl } from '$sol/utils/spl.utils';

	export let amount: OptionAmount = undefined;
	export let destination = '';
	export let source: string;

	const { sendTokenNetworkId, sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	const { ataFeeStore }: FeeContext = getContext<FeeContext>(SOL_FEE_CONTEXT_KEY);

	let amountError: SolAmountAssertionError | undefined;
	let invalidDestination: boolean;

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

	let invalid = true;
	$: invalid =
		invalidDestination ||
		nonNullish(amountError) ||
		isNullishOrEmpty(destination) ||
		isNullish(amount);
</script>

<SendForm on:icNext {source} token={$token} balance={$balance} disabled={invalid}>
	<SolSendDestination slot="destination" bind:destination bind:invalidDestination on:icQRCodeScan />

	<SolSendAmount slot="amount" bind:amount bind:amountError />

	<SolFeeDisplay slot="fee" />

	<slot name="cancel" slot="cancel" />
</SendForm>
