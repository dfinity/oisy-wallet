<script lang="ts">
    import ContentWithToolbar from "$lib/components/ui/ContentWithToolbar.svelte";
    import ButtonGroup from "$lib/components/ui/ButtonGroup.svelte";
    import ButtonBack from "$lib/components/ui/ButtonBack.svelte";
    import ButtonDone from "$lib/components/ui/ButtonDone.svelte";

    export let onBack: () => void;
    export let onDone: () => void;
</script>

<ContentWithToolbar>

    <div>

    </div>

    <ButtonGroup slot="toolbar">
        <ButtonBack on:click={onBack} />
        <ButtonDone on:click={onDone} />
    </ButtonGroup>
</ContentWithToolbar>
