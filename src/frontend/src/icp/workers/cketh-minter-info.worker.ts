import { minterInfo } from '$icp-eth/api/cketh-minter.api';
import { CKETH_MINTER_INFO_TIMER } from '$icp/constants/cketh.constants';
import { CkMinterInfoScheduler } from '$icp/schedulers/ck-minter-info.scheduler';
import type { PostMessage, PostMessageDataRequestIcCk } from '$lib/types/post-message';

const scheduler = new CkMinterInfoScheduler(CKETH_MINTER_INFO_TIMER, minterInfo);

export const onCkEthMinterInfoMessage = async ({
	data: dataMsg
}: MessageEvent<PostMessage<PostMessageDataRequestIcCk>>) => {
	const { msg, data } = dataMsg;

	switch (msg) {
		case 'stopCkMinterInfoTimer':
			scheduler.stop();
			return;
		case 'startCkMinterInfoTimer':
			await scheduler.start(data);
			return;
		case 'triggerCkMinterInfoTimer':
			await scheduler.trigger(data);
			return;
	}
};
