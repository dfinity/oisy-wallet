<script lang="ts">
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { nonNullish } from '@dfinity/utils';

	export let name: string;
	export let icon: string | undefined;
	export let logo: 'start' | 'end' = 'end';
	export let description: string | undefined = undefined;
</script>

<span
	class="flex"
	class:items-center={!description}
	class:gap-2={logo === 'start'}
	class:gap-1={logo === 'end'}
	class:flex-row-reverse={logo === 'start'}
>
	<span class="flex flex-col gap-0.5">
		<span class="leading-5">{name}</span>
		{#if nonNullish(description)}
			<span class="leading-none text-xs text-misty-rose text-left">{description}</span>
		{/if}
	</span>
	<Logo src={icon} alt={replacePlaceholders($i18n.core.alt.logo, { $name: name })} />
</span>
