<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { TRACK_HELP_SIGNING_IN } from '$lib/constants/analytics.contants';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	export let styleClass = '';
	export let testId: string | undefined = undefined;

	const modalId = Symbol();

	const onClick = () => {
		trackEvent({
			name: TRACK_HELP_SIGNING_IN
		});
		modalStore.openAuthHelp({ id: modalId, data: true });
	};
</script>

<span data-tid={testId} class={`${styleClass} flex flex-row justify-center gap-1 md:justify-start`}>
	{$i18n.auth.help.text.need_help}
	<Button link inlineLink onclick={onClick}>{$i18n.auth.help.text.sign_in}</Button>
</span>
