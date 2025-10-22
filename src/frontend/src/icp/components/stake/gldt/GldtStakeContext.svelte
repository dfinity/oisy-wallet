<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import { getDailyAnalytics } from '$icp/api/gldt_stake.api';
	import { GLDT_STAKE_CONTEXT_KEY, type GldtStakeContext } from '$icp/stores/gldt-stake.store';
	import { authIdentity } from '$lib/derived/auth.derived';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const { store: gldtStakeStore } = getContext<GldtStakeContext>(GLDT_STAKE_CONTEXT_KEY);

	const loadGldStakeApy = async () => {
		if (isNullish($authIdentity)) {
			gldtStakeStore.reset();
			return;
		}

		try {
			const { apy } = await getDailyAnalytics({ identity: $authIdentity });

			gldtStakeStore.setApy(Math.round(apy * 100) / 100);
		} catch (_err: unknown) {
			gldtStakeStore.reset();
		}
	};

	$effect(() => {
		loadGldStakeApy();
	});
</script>

{@render children()}
