<script lang="ts">
	import SendInputDestination from '$lib/components/send/SendInputDestination.svelte';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { isEthAddress } from '$lib/utils/account.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import { getContext } from 'svelte';
	import { FEE_CONTEXT_KEY, type FeeContext } from '$eth/stores/fee.store';

	export let destination = '';
	export let invalidDestination = false;

	let isInvalidDestination: () => boolean;
	$: isInvalidDestination = (): boolean => {
		if (isNullishOrEmpty(destination)) {
			return false;
		}

		return !isEthAddress(destination);
	};

	const { evaluateFee } = getContext<FeeContext>(FEE_CONTEXT_KEY);
	const onInput = () => evaluateFee?.();
</script>

<SendInputDestination
	bind:destination
	bind:invalidDestination
	{isInvalidDestination}
	inputPlaceholder={$i18n.send.placeholder.enter_eth_address}
	on:nnsInput={onInput}
/>
