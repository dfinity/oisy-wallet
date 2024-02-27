import { minterInfo } from '$icp/api/cketh-minter.api';
import { CKETH_MINTER_INFO_TIMER } from '$icp/constants/cketh.constants';
import { CkMinterInfoScheduler } from '$icp/schedulers/ck-minter-info.scheduler';
import type { PostMessage, PostMessageDataRequestIcCk } from '$lib/types/post-message';

const scheduler = new CkMinterInfoScheduler(CKETH_MINTER_INFO_TIMER, minterInfo);

onmessage = async ({ data: dataMsg }: MessageEvent<PostMessage<PostMessageDataRequestIcCk>>) => {
	const { msg, data } = dataMsg;

	switch (msg) {
		case 'stopCkETHMinterInfoTimer':
			scheduler.stop();
			return;
		case 'startCkETHMinterInfoTimer':
			await scheduler.start(data);
			return;
		case 'triggerCkETHMinterInfoTimer':
			await scheduler.trigger(data);
			return;
	}
};
