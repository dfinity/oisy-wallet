import { enqueue } from '$lib/services/worker.services';
import type { PostMessage, PostMessageDataRequest } from '$lib/types/post-message';
import { isNullish } from '@dfinity/utils';

onmessage = async (ev: MessageEvent<PostMessage<PostMessageDataRequest>>) => {
	const msg = ev.data?.msg;
	if (isNullish(msg)) {
		return;
	}

	await enqueue(ev);
};
