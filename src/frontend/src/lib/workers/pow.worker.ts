import type { PostMessage, PostMessageDataRequest } from '$lib/types/post-message';

export const FIRST_TIMER_INTERVAL = 5000;
export const onChallengeMessage = async ({
	data
	// eslint-disable-next-line require-await
}: MessageEvent<PostMessage<PostMessageDataRequest>>) => {
	const { msg } = data;

	switch (msg) {
		case 'startIdleTimer':
			startIdleTimer();
			return;
		case 'stopIdleTimer':
			stopIdleTimer();
			return;
	}
};

let timer: NodeJS.Timeout | undefined = undefined;

/**
 * The timer is executed only if user has signed in
 */
const startIdleTimer = () =>
	(timer = setInterval(async () => await onIdleSignOut(), FIRST_TIMER_INTERVAL));

const stopIdleTimer = () => {
	if (!timer) {
		return;
	}

	clearInterval(timer);
	timer = undefined;
};

const onIdleSignOut = async () => {
	logout();
};

// We do the logout on the client side because we reload the window to reload stores afterwards
const logout = () => {
	// Clear timer to not emit sign-out multiple times
	stopIdleTimer();
};
