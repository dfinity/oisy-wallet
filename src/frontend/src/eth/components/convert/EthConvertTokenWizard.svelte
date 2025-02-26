<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext, setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import { ICP_NETWORK } from '$env/networks/networks.env';
	import EthConvertForm from '$eth/components/convert/EthConvertForm.svelte';
	import EthConvertProgress from '$eth/components/convert/EthConvertProgress.svelte';
	import EthConvertReview from '$eth/components/convert/EthConvertReview.svelte';
	import FeeContext from '$eth/components/fee/FeeContext.svelte';
	import { selectedEthereumNetwork } from '$eth/derived/network.derived';
	import { ethereumToken } from '$eth/derived/token.derived';
	import { send as executeSend } from '$eth/services/send.services';
	import {
		FEE_CONTEXT_KEY,
		type FeeContext as FeeContextType,
		initFeeContext,
		initFeeStore
	} from '$eth/stores/fee.store';
	import { isTokenErc20 } from '$eth/utils/erc20.utils';
	import { isErc20Icp } from '$eth/utils/token.utils';
	import {
		ckErc20HelperContractAddress,
		ckEthHelperContractAddress
	} from '$icp-eth/derived/cketh.derived';
	import { assertCkEthMinterInfoLoaded } from '$icp-eth/services/cketh.services';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import { mapAddressStartsWith0x } from '$icp-eth/utils/eth.utils';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import {
		TRACK_COUNT_CONVERT_ETH_TO_CKETH_ERROR,
		TRACK_COUNT_CONVERT_ETH_TO_CKETH_SUCCESS
	} from '$lib/constants/analytics.contants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { ProgressStepsSend } from '$lib/enums/progress-steps';
	import { WizardStepsConvert } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { TokenId } from '$lib/types/token';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	export let currentStep: WizardStep | undefined;
	export let sendAmount: OptionAmount;
	export let receiveAmount: number | undefined;
	export let convertProgressStep: string;
	export let formCancelAction: 'back' | 'close' = 'close';

	const { sourceToken } = getContext<ConvertContext>(CONVERT_CONTEXT_KEY);

	let feeStore = initFeeStore();

	let feeSymbolStore = writable<string | undefined>(undefined);
	$: feeSymbolStore.set($ethereumToken.symbol);

	let feeTokenIdStore = writable<TokenId | undefined>(undefined);
	$: feeTokenIdStore.set($ethereumToken.id);

	let feeDecimalsStore = writable<number | undefined>(undefined);
	$: feeDecimalsStore.set($ethereumToken.decimals);

	let feeExchangeRateStore = writable<number | undefined>(undefined);
	$: feeExchangeRateStore.set($exchanges?.[$ethereumToken.id]?.usd);

	let feeContext: FeeContext | undefined;
	const evaluateFee = () => feeContext?.triggerUpdateFee();

	setContext<FeeContextType>(
		FEE_CONTEXT_KEY,
		initFeeContext({
			feeStore,
			feeSymbolStore,
			feeTokenIdStore,
			feeDecimalsStore,
			feeExchangeRateStore,
			evaluateFee
		})
	);

	let destination = '';
	$: destination = isTokenErc20($sourceToken)
		? ($ckErc20HelperContractAddress ?? '')
		: ($ckEthHelperContractAddress ?? '');

	const dispatch = createEventDispatcher();

	const convert = async () => {
		if (isNullishOrEmpty(destination)) {
			toastsError({
				msg: { text: $i18n.send.assertion.destination_address_invalid }
			});
			return;
		}

		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		if (isNullish(sendAmount) || invalidAmount(sendAmount)) {
			toastsError({
				msg: { text: $i18n.send.assertion.amount_invalid }
			});
			return;
		}

		if (isNullish($feeStore)) {
			toastsError({
				msg: { text: $i18n.send.assertion.gas_fees_not_defined }
			});
			return;
		}

		const { valid } = assertCkEthMinterInfoLoaded({
			minterInfo: $ckEthMinterInfoStore?.[$ethereumToken.id],
			network: ICP_NETWORK
		});

		if (!valid) {
			return;
		}

		// https://github.com/ethers-io/ethers.js/discussions/2439#discussioncomment-1857403
		const { maxFeePerGas, maxPriorityFeePerGas, gas } = $feeStore;

		// https://docs.ethers.org/v5/api/providers/provider/#Provider-getFeeData
		// exceeds block gas limit
		if (isNullish(maxFeePerGas) || isNullish(maxPriorityFeePerGas)) {
			toastsError({
				msg: { text: $i18n.send.assertion.max_gas_fee_per_gas_undefined }
			});
			return;
		}

		// Unexpected errors
		if (isNullish($ethAddress) || isNullish($ckEthHelperContractAddress)) {
			toastsError({
				msg: { text: $i18n.send.assertion.address_unknown }
			});
			return;
		}

		dispatch('icNext');

		try {
			await executeSend({
				from: $ethAddress,
				to: isErc20Icp($sourceToken) ? destination : mapAddressStartsWith0x(destination),
				progress: (step: ProgressStepsSend) => (convertProgressStep = step),
				token: $sourceToken,
				amount: parseToken({
					value: `${sendAmount}`,
					unitName: $sourceToken.decimals
				}),
				maxFeePerGas,
				maxPriorityFeePerGas,
				gas,
				sourceNetwork: $selectedEthereumNetwork,
				targetNetwork: ICP_NETWORK,
				identity: $authIdentity,
				minterInfo: $ckEthMinterInfoStore?.[$ethereumToken.id]
			});

			await trackEvent({
				name: TRACK_COUNT_CONVERT_ETH_TO_CKETH_SUCCESS
			});

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			await trackEvent({
				name: TRACK_COUNT_CONVERT_ETH_TO_CKETH_ERROR
			});

			toastsError({
				msg: { text: $i18n.send.error.unexpected },
				err
			});

			dispatch('icBack');
		}
	};

	const close = () => dispatch('icClose');
	const back = () => dispatch('icBack');
</script>

<FeeContext
	bind:this={feeContext}
	sendToken={$sourceToken}
	sendTokenId={$sourceToken.id}
	amount={sendAmount}
	{destination}
	observe={currentStep?.name !== WizardStepsConvert.CONVERTING}
	sourceNetwork={$selectedEthereumNetwork}
	targetNetwork={ICP_NETWORK}
	nativeEthereumToken={$ethereumToken}
>
	{#if currentStep?.name === WizardStepsConvert.CONVERT}
		<EthConvertForm on:icNext on:icClose bind:sendAmount bind:receiveAmount {destination}>
			<svelte:fragment slot="cancel">
				{#if formCancelAction === 'back'}
					<ButtonBack on:click={back} />
				{:else}
					<ButtonCancel on:click={close} />
				{/if}
			</svelte:fragment>
		</EthConvertForm>
	{:else if currentStep?.name === WizardStepsConvert.REVIEW}
		<EthConvertReview on:icConvert={convert} on:icBack {sendAmount} {receiveAmount}>
			<ButtonBack slot="cancel" on:click={back} />
		</EthConvertReview>
	{:else if currentStep?.name === WizardStepsConvert.CONVERTING}
		<EthConvertProgress
			bind:convertProgressStep
			sourceTokenId={$sourceToken.id}
			{destination}
			nativeEthereumToken={$ethereumToken}
		/>
	{:else}
		<slot />
	{/if}
</FeeContext>
