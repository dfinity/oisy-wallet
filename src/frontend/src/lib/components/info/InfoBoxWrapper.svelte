<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { type HideInfoKey, saveHideInfo, shouldHideInfo } from '$icp/utils/ck.utils';
	import InfoBox from '$lib/components/info/InfoBox.svelte';

	export let key: HideInfoKey | undefined;

	let hideInfo = true;
	$: hideInfo = nonNullish(key) ? shouldHideInfo(key) : true;

	const close = () => {
		hideInfo = true;

		if (isNullish(key)) {
			return;
		}

		saveHideInfo(key);
	};
</script>

<InfoBox {hideInfo} on:click={close}>
	<slot />
</InfoBox>
