<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import { getApyOverall } from '$icp/api/gldt_stake.api';
	import {
		GLDT_STAKE_APY_CONTEXT_KEY,
		type GldtStakeApyContext
	} from '$icp/stores/gldt-stake-apy.store';
	import { authIdentity } from '$lib/derived/auth.derived';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const { store: gldtStakeApyStore } = getContext<GldtStakeApyContext>(GLDT_STAKE_APY_CONTEXT_KEY);

	const loadGldStakeApy = async () => {
		if (isNullish($authIdentity)) {
			gldtStakeApyStore.reset();
			return;
		}

		try {
			const apy = await getApyOverall({ identity: $authIdentity });

			gldtStakeApyStore.setApy(Math.round(apy * 100) / 100);
		} catch (_err: unknown) {
			gldtStakeApyStore.reset();
		}
	};

	$effect(() => {
		loadGldStakeApy();
	});
</script>

{@render children()}
