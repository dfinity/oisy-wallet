<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import InfoBox from '$lib/components/info/InfoBox.svelte';
	import { type HideInfoKey, saveHideInfo, shouldHideInfo } from '$lib/utils/info.utils';

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
