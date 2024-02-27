import { minterInfo } from '$icp/api/ckbtc-minter.api';
import { CKBTC_MINTER_INFO_TIMER } from '$icp/constants/ckbtc.constants';
import { CkMinterInfoScheduler } from '$icp/schedulers/ck-minter-info.scheduler';
import type { PostMessage, PostMessageDataRequestIcCk } from '$lib/types/post-message';

const scheduler = new CkMinterInfoScheduler(CKBTC_MINTER_INFO_TIMER, minterInfo);

onmessage = async ({ data: dataMsg }: MessageEvent<PostMessage<PostMessageDataRequestIcCk>>) => {
	const { msg, data } = dataMsg;

	switch (msg) {
		case 'stopCkBTCMinterInfoTimer':
			scheduler.stop();
			return;
		case 'startCkBTCMinterInfoTimer':
			await scheduler.start(data);
			return;
		case 'triggerCkBTCMinterInfoTimer':
			await scheduler.trigger(data);
			return;
	}
};
