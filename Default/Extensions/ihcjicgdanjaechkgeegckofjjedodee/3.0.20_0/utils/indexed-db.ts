import { isIndexedDbAvailable } from './utils.js';
import { indexedDB } from './polyfill';

// Define types for params
interface IndexedDbParams {
    dbName: string;
    storeName: string;
    storeOptions: IDBObjectStoreParameters;
    dbVersion?: number;
    waitStrategy?: "allOrNothing" | "allSettled";
    values?: any[];
    keys?: any[];
}

// Function to run operations within IndexedDB
const runWithinIndexedDb = <T>(
    params: IndexedDbParams,
    valuesProp: 'values' | 'keys',
    objCallback: (store: IDBObjectStore, item: any) => Promise<T>
): Promise<T[]> => new Promise((resolve, reject) => {
    if (!isIndexedDbAvailable) {
        reject(new Error('IndexedDb not available'));
        return;
    }
    const {
        dbName,
        storeName,
        storeOptions,
    } = params;
    let { dbVersion = 1, waitStrategy = "allOrNothing" } = params;

    const request:IDBOpenDBRequest = indexedDB.open(dbName, dbVersion);
    let db: IDBDatabase | undefined;
    let tx: IDBTransaction | undefined;
    let store: IDBObjectStore | undefined;

    request.onupgradeneeded = () => {
        db = request.result;
        store = db.createObjectStore(storeName, storeOptions);
    };

    request.onerror = (e) => {
        console.error(`IDB: Error opening IndexedDB ${dbName}`, e);
        reject(e);
    };

    request.onsuccess = async () => {
        console.debug(`IDB: Successfully opened IndexedDB ${dbName}`);
        db = request.result;
        tx = db.transaction(storeName, "readwrite");
        tx.oncomplete = () => db && db.close();
        store = tx.objectStore(storeName);

        db.onerror = (e) => {
            console.error(`IDB: db.onerror ${dbName}`, e);
            reject(e);
        };

        const resultsPromise = waitStrategy === "allOrNothing"
        ? Promise.all(params[valuesProp]!.map((v) => objCallback(store!, v)))
        : Promise.allSettled(params[valuesProp]!.map((v) => objCallback(store!, v)))
        resolve(resultsPromise as Promise<T[]>);
    };
});

// Function to save an object in IndexedDB
const saveObj = (store: IDBObjectStore, obj: any): Promise<boolean> => new Promise((resolve, reject) => {
    const dataPut = store.put(obj);
    dataPut.onsuccess = () => {
        resolve(true);
    };
    dataPut.onerror = (err) => reject(err);
});

// Exported function to save objects
export const saveObjs = (params: IndexedDbParams): Promise<boolean[]> => runWithinIndexedDb(params, 'values', saveObj);

// Function to load an object from IndexedDB
const loadObj = (store: IDBObjectStore, name: any): Promise<any> => new Promise((resolve, reject) => {
    const db = store.get(name);
    db.onsuccess = () => {
        resolve(db.result);
    };
    db.onerror = (err) => reject(err);
});

// Exported function to get objects
export const getObjs = (params: IndexedDbParams): Promise<any[]> => runWithinIndexedDb(params, 'keys', loadObj);

// Exported function to delete the whole IndexedDB
export const deleteDb = (dbName: string): Promise<void> => new Promise((resolve, reject) => {
    if (!isIndexedDbAvailable) {
        reject(new Error('IndexedDb not available'));
        return;
    }
    const request = indexedDB.open(dbName);
    let db: IDBDatabase | undefined;
    request.onerror = (err) => {
        reject(err);
    };
    request.onsuccess = () => {
        db = request.result;
        db.onerror = (e) => {
            reject(e);
        };
        db.close();

        const deleteRequest = indexedDB.deleteDatabase(dbName);
        deleteRequest.onsuccess = () => {
            resolve();
        };
        deleteRequest.onerror = (err) => {
            reject(err);
        };
    };
});
