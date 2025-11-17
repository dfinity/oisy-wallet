<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import { getDailyAnalytics, getPosition } from '$icp/api/gldt_stake.api';
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

			gldtStakeStore.setApy(apy);
		} catch (_err: unknown) {
			gldtStakeStore.resetApy();
		}
	};

	const loadGldStakePosition = async () => {
		if (isNullish($authIdentity)) {
			gldtStakeStore.reset();
			return;
		}

		try {
			const position = await getPosition({ identity: $authIdentity });

			gldtStakeStore.setPosition(position);
		} catch (_err: unknown) {
			gldtStakeStore.resetPosition();
		}
	};

	$effect(() => {
		loadGldStakeApy();
		loadGldStakePosition();
	});
</script>

{@render children()}
