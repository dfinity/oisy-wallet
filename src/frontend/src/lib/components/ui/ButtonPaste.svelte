<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { readClipboard } from '$lib/utils/share.utils';

	let { onpaste }: { onpaste: (text: string) => void } = $props();

	const handlePaste = async () => {
		const text = await readClipboard();
		if (isNullish(text)) {
			return;
		}
		onpaste(text);
	};
</script>

<Button
	ariaLabel={$i18n.core.text.paste}
	colorStyle="tertiary-alt"
	link
	onclick={handlePaste}
	styleClass="text-sm px-1 py-2 mx-1"
	type="button">{$i18n.core.text.paste}</Button
>
