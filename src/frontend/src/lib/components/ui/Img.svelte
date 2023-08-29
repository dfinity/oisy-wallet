<script lang="ts">
	export let src: string;
	export let alt = '';
	export let role = 'presentation';
	export let loading: 'eager' | 'lazy' = 'lazy';
	export let width: string | undefined = undefined;
	export let height: string | undefined = undefined;
</script>

<img {src} {role} {alt} {loading} {width} {height} decoding="async" />
