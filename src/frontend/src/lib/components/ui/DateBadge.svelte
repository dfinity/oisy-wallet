<script lang="ts">
    import Badge from '$lib/components/ui/Badge.svelte';

    export let date: Date;
    export let prefix: string | undefined = undefined;
    export let suffix: string | undefined = undefined;
    export let testId: string | undefined = undefined;

    let formattedDate = `${date.toLocaleDateString('en-US', { month: 'long' })} ${date.getDate()}`;
</script>

<ul class="gap-2 flex list-none flex-wrap" data-tid={testId}>
    <li class="flex">
        <Badge>
            {prefix ?? ''} {formattedDate} {suffix ?? ''}
        </Badge>
    </li>
</ul>
