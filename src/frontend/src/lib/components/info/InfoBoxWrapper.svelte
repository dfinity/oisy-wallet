<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import InfoBox from '$lib/components/info/InfoBox.svelte';
	import { type HideInfoKey, saveHideInfo, shouldHideInfo } from '$lib/utils/info.utils';

	interface Props {
		key?: HideInfoKey;
		children: Snippet;
	}

	let { key, children }: Props = $props();

	let hideInfo = $derived(nonNullish(key) ? shouldHideInfo(key) : true);

	const close = () => {
		hideInfo = true;

		if (isNullish(key)) {
			return;
		}

		saveHideInfo(key);
	};
</script>

<InfoBox {hideInfo} onClick={close}>
	{@render children()}
</InfoBox>
