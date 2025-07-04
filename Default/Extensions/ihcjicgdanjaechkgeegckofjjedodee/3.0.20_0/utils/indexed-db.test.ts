import { saveObjs, getObjs, deleteDb } from './indexed-db';
import { indexedDB } from './polyfill';

    describe('IndexedDB Utility Functions', () => {
        const dbName = 'testDb';
        const storeName = 'testStore';
        const storeOptions = { keyPath: 'id' };
        const testParams = {
            dbName,
            storeName,
            storeOptions,
            values: [{ id: 1, name: 'test1' }, { id: 2, name: 'test2' }],
            keys: [1, 2]
        };

        beforeEach(async () => {
            await deleteDb(dbName);
        });

        afterEach(async () => {
            await deleteDb(dbName);
        });

        it('should handle error when saving objects to IndexedDB', async () => {
            const params = { ...testParams, values: [null] };
            await expect(saveObjs(params)).rejects.toThrow();
        });
    });
