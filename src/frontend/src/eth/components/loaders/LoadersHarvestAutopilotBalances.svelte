<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { disabledHarvestAutopilotTokens } from '$eth/derived/harvest-autopilots.derived';
	import { loadErc20Balances } from '$eth/services/eth-balance.services';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { syncBalancesFromCache } from '$lib/services/listener.services';

	let loading = $state(false);
	let timer = $state<NodeJS.Timeout | undefined>();

	const resetTimer = () => {
		if (nonNullish(timer)) {
			clearTimeout(timer);
			timer = undefined;
		}
	};

	const onLoad = async () => {
		if (isNullish($ethAddress)) {
			return;
		}

		if (loading) {
			resetTimer();

			timer = setTimeout(() => {
				resetTimer();

				onLoad();
			}, 500);

			return;
		}

		loading = true;

		await loadErc20Balances({
			address: $ethAddress,
			tokens: $disabledHarvestAutopilotTokens
		});

		loading = false;
	};

	const debounceLoad = debounce(onLoad, 1000);

	$effect(() => {
		// To trigger the load function when any of the dependencies change.
		[$ethAddress, $disabledHarvestAutopilotTokens];

		debounceLoad();
	});

	onMount(async () => {
		if (isNullish($authIdentity)) {
			return;
		}

		const principal = $authIdentity.getPrincipal();

		loading = true;

		await Promise.allSettled(
			$disabledHarvestAutopilotTokens.map(async ({ id: tokenId, network: { id: networkId } }) => {
				await syncBalancesFromCache({
					principal,
					tokenId,
					networkId
				});
			})
		);

		loading = false;
	});
</script>

<IntervalLoader interval={WALLET_TIMER_INTERVAL_MILLIS} {onLoad} />
