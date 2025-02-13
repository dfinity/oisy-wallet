<script lang="ts">
    import Badge from '$lib/components/ui/Badge.svelte';
    import { i18n } from '$lib/stores/i18n.store';
    import { replacePlaceholders } from '$lib/utils/i18n.utils';

    export let endDate: Date;
    export let testId: string | undefined = undefined;
    let formattedDate = `${endDate.toLocaleDateString('en-US', { month: 'long' })} ${endDate.getDate()}`;
</script>

<ul class="gap-2 flex list-none flex-wrap" data-tid={testId}>
    <li class="flex">
        <Badge>
            {replacePlaceholders($i18n.airdrops.text.active_date, { $date: formattedDate })}
        </Badge>
    </li>
</ul>