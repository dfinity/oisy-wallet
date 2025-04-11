import { POW_TIMER_INTERVAL } from '$lib/constants/app.constants';
import type { PostMessage, PostMessageDataRequest } from '$lib/types/post-message';
import { isNullish, nonNullish } from '@dfinity/utils';

// eslint-disable-next-line require-await
export const onPowMessage = async ({ data }: MessageEvent<PostMessage<PostMessageDataRequest>>) => {
	const { msg } = data;

	switch (msg) {
		case 'stopPowTimer':
			stopPowTimer();
			return;
		case 'startPowTimer':
			startPowTimer();
			// TODO: add function to run when the timer starts
			return;
		case 'setPowThrottle':
			// TODO: add function to set the throttle
			return;
	}
};

let timer: NodeJS.Timeout | undefined = undefined;

const startPowTimer = () => {
	if (nonNullish(timer)) {
		return;
	}

	// TODO: add function to run when the timer starts
	timer = setInterval(() => {}, POW_TIMER_INTERVAL);
};

const stopPowTimer = () => {
	if (isNullish(timer)) {
		return;
	}

	clearInterval(timer);
	timer = undefined;
};
