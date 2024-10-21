import { initStorageStore} from '$lib/stores/storage.store';

export interface GroupData {
	expanded: boolean;
}

export interface GroupsData {
	[key: string]: GroupData;
}

export const groupsStore = initStorageStore<GroupsData>({ key: 'groups' });
