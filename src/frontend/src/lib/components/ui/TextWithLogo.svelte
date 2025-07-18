<script lang="ts">
	import { nonNullish } from '@dfinity/utils';

	export let name: string;
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
			<span class="text-left text-xs leading-none text-tertiary">{description}</span>
		{/if}
	</span>
	<slot name="icon" />
</span>
