import { getAirdropCode } from '$airdrop/api/airdrop.api';
import { CODE_TIMER_INTERVAL } from '$airdrop/constants/airdrop.constants';
import type { PostMessage, PostMessageDataRequest } from '$lib/types/post-message';
import type { Identity } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';
import { isNullish } from '@dfinity/utils';

onmessage = async ({ data }: MessageEvent<PostMessage<PostMessageDataRequest>>) => {
	const { msg } = data;

	switch (msg) {
		case 'startCodeTimer':
			await startCodeTimer();
			return;
		case 'stopCodeTimer':
			stopCodeTimer();
			return;
	}
};

let timer: NodeJS.Timeout | undefined = undefined;

const stopCodeTimer = () => {
	if (!timer) {
		return;
	}

	clearInterval(timer);
	timer = undefined;
};

const startCodeTimer = async () => {
	const sync = async () => await syncCode();

	// We sync the codes now but also schedule the update afterwards
	await sync();

	timer = setInterval(sync, CODE_TIMER_INTERVAL);
};

let syncing = false;

const syncCode = async () => {
	// We avoid to relaunch a sync while previous sync is not finished
	if (syncing) {
		return;
	}

	const identity: Identity | undefined = await loadIdentity();

	if (isNullish(identity)) {
		stopCodeTimer();
		return;
	}

	syncing = true;

	try {
		const airdrop = await getAirdropCode(identity);

		postMessage({
			msg: 'syncAirdropCode',
			data: {
				airdrop
			}
		});
	} catch (err: unknown) {
		console.error(err);
		stopCodeTimer();
	}

	syncing = false;
};

const loadIdentity = async (): Promise<Identity | undefined> => {
	const authClient = await AuthClient.create({
		idleOptions: {
			disableIdle: true,
			disableDefaultIdleCallback: true
		}
	});

	return authClient.getIdentity();
};
