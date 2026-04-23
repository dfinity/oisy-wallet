<script lang="ts">
	import IconArrowRightCircle from '$lib/components/icons/lucide/IconArrowRightCircle.svelte';
	import { LOGIN_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		onclick: () => void;
		fullWidth?: boolean;
	}

	let { onclick, fullWidth = false }: Props = $props();
</script>

<button
	class="hover:border-brand-primary-alt focus-visible:outline-brand-primary-alt flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-brand-subtle-20 bg-primary px-5 py-4 text-base leading-[22px] font-semibold whitespace-nowrap text-brand-primary-alt transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
	class:md:w-[200px]={!fullWidth}
	data-tid={LOGIN_BUTTON}
	{onclick}
	type="button"
>
	{$i18n.auth.text.internet_identity}
	<IconArrowRightCircle size="24" />
</button>
