<script lang="ts">
	export let src: string;
	export let alt = '';
	export let role = 'presentation';
	export let loading: 'eager' | 'lazy' = 'lazy';
	export let width: string | undefined = undefined;
	export let height: string | undefined = undefined;
	export let rounded = false;
	export let fitHeight = false;
	export let extraClass: string | undefined = undefined;
</script>

<img
	{src}
	{role}
	{alt}
	{loading}
	{width}
	{height}
	decoding="async"
	on:load
	on:error
	class:rounded-full={rounded}
	style={fitHeight ? `max-width: inherit; height: ${height};` : undefined}
	class={extraClass}
/>
