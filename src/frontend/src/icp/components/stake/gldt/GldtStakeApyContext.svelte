<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import {
		GLDT_STAKE_APY_CONTEXT_KEY,
		type GldtStakeApyContext
	} from '$icp/stores/gldt-stake-apy.store';
	import { getApyOverall } from '$lib/api/gldt_stake.api';
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
			gldtStakeApyStore.setApy(await getApyOverall({ identity: $authIdentity }));
		} catch (_err: unknown) {
			gldtStakeApyStore.reset();
		}
	};

	$effect(() => {
		loadGldStakeApy();
	});
</script>

{@render children()}
