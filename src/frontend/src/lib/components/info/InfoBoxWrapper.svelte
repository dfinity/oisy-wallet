<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { CkHideInfoKey } from '$icp/utils/ck.utils';
	import InfoBox from '$lib/components/info/InfoBox.svelte';
	import { saveHideInfo, shouldHideInfo } from '$lib/utils/info.utils';

	export let key: CkHideInfoKey | undefined;

	let hideInfo = true;
	$: hideInfo = nonNullish(key) ? shouldHideInfo<CkHideInfoKey>(key) : true;

	const close = () => {
		hideInfo = true;

		if (isNullish(key)) {
			return;
		}

		saveHideInfo<CkHideInfoKey>(key);
	};
</script>

<InfoBox {hideInfo} on:click={close}>
	<slot />
</InfoBox>
