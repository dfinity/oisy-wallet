<script lang="ts">
	import { TRACK_HELP_SIGNING_IN } from '$lib/constants/analytics.contants';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import Button from "$lib/components/ui/Button.svelte";

	export let noUnderline = false;
	export let styleClass = '';

	const onClick = async () => {
		await trackEvent({
			name: TRACK_HELP_SIGNING_IN
		});
		modalStore.openAuthHelp(true);
	};
</script>

<span class={`${styleClass} flex flex-row gap-1`}>
	{$i18n.auth.help.text.need_help}
	<Button link inlineLink on:click={onClick}>{$i18n.auth.help.text.sign_in}</Button>
</span>
