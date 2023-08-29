<script lang="ts">
	export let src: string;
	export let alt = '';
	export let role = 'presentation';
    export let loading: "eager" | "lazy" = "lazy";
</script>

<img {src} {role} {alt} {loading} decoding="async" />
