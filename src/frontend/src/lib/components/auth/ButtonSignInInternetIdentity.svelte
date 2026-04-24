<script lang="ts">
	import IconArrowRightCircle from '$lib/components/icons/lucide/IconArrowRightCircle.svelte';
	import { LOGIN_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		onclick: () => void;
		fullWidth?: boolean;
		variant?: 'login' | 'lock';
		rowBreakpoint?: 'sm' | 'md';
	}

	let { onclick, fullWidth = false, variant = 'login', rowBreakpoint = 'md' }: Props = $props();

	const variantClasses = $derived(
		variant === 'lock'
			? 'bg-brand-primary text-primary-inverted hover:bg-brand-secondary focus-visible:outline-brand-primary'
			: 'bg-primary text-brand-primary-alt border border-brand-subtle-20 hover:border-brand-primary-alt focus-visible:outline-brand-primary-alt'
	);

	const widthClasses = $derived(
		fullWidth ? '' : rowBreakpoint === 'sm' ? 'sm:flex-1' : 'md:w-[200px]'
	);
</script>

<button
	class={`flex h-14 w-full items-center justify-center gap-3 rounded-2xl px-5 py-4 text-base leading-[22px] font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${variantClasses} ${widthClasses}`}
	data-tid={LOGIN_BUTTON}
	{onclick}
	type="button"
>
	{$i18n.auth.text.internet_identity}
	<IconArrowRightCircle size="24" />
</button>
