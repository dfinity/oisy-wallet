<script lang="ts">
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import Logo from '$lib/components/ui/Logo.svelte';

	export let name: string;
	export let icon: string | undefined;
	export let logo: 'start' | 'end' = 'end';
</script>

<span
	class="flex items-center"
	class:gap-2={logo === 'start'}
	class:gap-1={logo === 'end'}
	class:flex-row-reverse={logo === 'start'}
>
	<span>{name}</span>
	<Logo src={icon} alt={replacePlaceholders($i18n.core.alt.logo, { $name: name })} />
</span>
