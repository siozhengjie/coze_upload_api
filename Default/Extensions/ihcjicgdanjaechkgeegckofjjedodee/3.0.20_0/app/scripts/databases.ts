import {
  loadBundledDatabases,
  loadCachedDatabases,
  loadIdbStorageDatabases,
  saveDbsToCache,
} from "@/utils/databases/db-persistence";
import { DB_NAMES_ALL } from "@/utils/databases/db-consts";
import { IndexedDatabase } from "@/utils/databases/indexed-database";
import { Settings } from "./settings";
import { cleanDbName } from "@/utils/utils";

type DbDataType =
  | IndexedDatabase
  | Record<string, any>
  | Array<Record<string, any>>;

interface DbType {
  cleanName: string;
  data: DbDataType;
  isBloom: boolean;
  isFeatureFlags?: boolean;
  isRaw: boolean;
  isRegex: boolean;
  name: string;
  rawData?: DbDataType;
  version: string;
  [key: string]: any;
}

const ALL_DBS = [...DB_NAMES_ALL, 'easylistprivacy', 'easylist'];

export class DatabaseManager {
  private DATABASES: Record<string, DbType> = {};
  private static instance: DatabaseManager;
  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async initDatabases(settings: Settings, dbNames: string[] = ALL_DBS) : Promise<void> {
    const dbsToLoad = dbNames;
    const allDbs = await this.loadFromCache(dbsToLoad, settings);
    Object.assign(this.DATABASES, allDbs);
  }

  public async getDatabases(settings: Settings, dbNames: string[] = ALL_DBS): Promise<Record<string, DbType | undefined>> {
    const loadedDbs: Record<string, DbType | undefined> = {};

    const dbsToLoad = <string[]>[];
    for (const dbName of dbNames) {
      const cleanName = cleanDbName(dbName);
      if (this.DATABASES[cleanName]) {
        loadedDbs[cleanName] = this.DATABASES[cleanName];
      } else {
        dbsToLoad.push(dbName);
      }
    }

    if (dbsToLoad.length > 0) {
      const dbs = await this.loadFromCache(dbsToLoad, settings);
      Object.assign(loadedDbs, dbs);
    }

    Object.assign(this.DATABASES, loadedDbs);

    return loadedDbs;    
  }

  public async getDatabaseByName(name: string, settings: Settings): Promise<DbType | undefined> {
    if (this.DATABASES[name]) {
      return this.DATABASES[name];
    }

    const dbs = await this.getDatabases(settings, [name]);
    return dbs[name];
  }

  public async getAllAvailableDatabaseNames(settings: Settings): Promise<string[]> {
    const dbs = await this.getDatabases(settings);
    const dbNames = Object.values(dbs)
      .filter((db) => !!db && !!db.name)
      .map((db) => db!.name);
    return dbNames;
  }

  /**
   * Returns a copy of the cached databases. Does not attempt to fallback to
   * the cached databases from indexedDB or idbStorage.
   */
  public getCachedDatabases(keys?: string[]): Record<string, DbType | undefined> {
    if (!keys) {
      return { ...this.DATABASES };
    }
    const result = {};
    for (const key of keys) {
      result[key] = this.DATABASES[key];
    }
    return result;
  }

  /**
   * Returns a copy of a single cached database by name. Does not attempt to
   * fallback to the cached databases from indexedDB or idbStorage.
   */
  public getCachedDatabaseByName(name: string): DbType | undefined {
    return this.DATABASES[name];
  }

  public setDatabase(name: string, database: DbType) {
    this.DATABASES[name] = database;
  }

  public updateDatabase(
    name: string,
    { appendData, setData, fieldsToUpdate }: { appendData?: DbDataType, setData?: DbDataType, fieldsToUpdate?: Record<string, any> }
  ) {
    
    if (this.DATABASES[name]) {
      if (appendData) {
        if (Array.isArray(this.DATABASES[name].data)) {
          this.DATABASES[name].data.push(appendData);
        }
      }

      if (setData) {
        this.DATABASES[name].data = setData;
      }

      if (fieldsToUpdate) {
        Object.assign(this.DATABASES[name], fieldsToUpdate);
      }
    }
  }

  public getDatabaseNamesAndVersionsString(): string {
    let dbs = Object.keys(this.DATABASES).map((key) => {
      const db = this.DATABASES[key];
      return `(${db.name}:${db.version})`;
    });
    return "Databases: " + dbs.join(", ");
  }

  public clear() {
    this.DATABASES = {};
  }

  public async updateDatabasesCache(settings: Settings, databases: DbType[]): Promise<void> {
    if (databases.length === 0) {
      return;
    }

    if (!indexedDB) {
      settings.setToStorage({cachedDatabases: false});
      console.debug("DBM.UDC: IndexedDB not available in this browser, skipping DB cache update");
      return;
    }

    // filter out  undefined
    const filteredDatabases = databases.filter((x) => x !== undefined);

    console.log(`DBM.UDC: ${filteredDatabases.length} will be saved in the cache`, {filteredDatabases});
    console.debug(`DBM.UDC: Databases to be cached:`, filteredDatabases.map((x) => x.name));

    try {
      await saveDbsToCache(filteredDatabases);
      await settings.setToStorage({ cachedDatabases: true });
    } catch (error) {
      console.error("UDC: Error during saving databases to the cache", error);
        return;
    }
  }

  async loadFromCache(names: string[], settings: Settings): Promise<Record<string, DbType | undefined>> {
    let databasesToLoad = names;
    let loadedDBNames = <string[]>[];
    let allLoadedDatabases: DbType[] = [];
    let loadedFromCache = false;
    let loadedFromIdbStorage = false;
    let loadedFromBundledFiles = false;
    let cachedDBCount = 0, idbCount = 0, bundledDBCount = 0;

    while (databasesToLoad.length > 0) {
      let databases: DbType[];

      if (!loadedFromCache && settings.cachedDatabases === true && !!indexedDB) {
        console.debug("DBM: Databases cache detected");
        databases = await loadCachedDatabases(databasesToLoad);
        allLoadedDatabases.push(...databases);
        loadedFromCache = true;
        loadedDBNames.push(...databases.map((x) => x.name));
        databasesToLoad = databasesToLoad.filter((x) => !loadedDBNames.includes(x));
        cachedDBCount = databases.length;
        continue;
      } else {
        console.log("DBM: Cached databases not available");
      }

      if (!loadedFromIdbStorage && settings.idbStorageDatabases === true) {
        console.debug(`DBM: ${databasesToLoad.length} databases will be loaded from IdbStorage`);
        databases = await loadIdbStorageDatabases(databasesToLoad);
        allLoadedDatabases.push(...databases);
        loadedFromIdbStorage = true;
        loadedDBNames.push(...databases.map((x) => x.name));
        databasesToLoad = databasesToLoad.filter((x) => !loadedDBNames.includes(x));
        idbCount = databases.length;
        continue;
      }

      if (!loadedFromBundledFiles) {
        console.debug(`DBM: ${databasesToLoad.length} bundled databases will be loaded`);
        databases = await loadBundledDatabases(databasesToLoad);
        allLoadedDatabases.push(...databases);
        loadedFromBundledFiles = true;
        loadedDBNames.push(...databases.map((x) => x.name));
        databasesToLoad = databasesToLoad.filter((x) => !loadedDBNames.includes(x));
        bundledDBCount = databases.length;
        break;
      }
    }

    console.log(`DBM: ${allLoadedDatabases.length}/${DB_NAMES_ALL.length} databases loaded. ${cachedDBCount} from cache, ` +
      `${idbCount} from IdbStorage, ${bundledDBCount} from the db directory (bundled)`);

    const dbRecords: Record<string, DbType | undefined> = {};
    for (const db of allLoadedDatabases) {
      dbRecords[db.cleanName] = db;
    }    

    if (databasesToLoad.length > 0) {
      for (const dbName of databasesToLoad) {
        dbRecords[cleanDbName(dbName)] = undefined;
      }
    }

    return dbRecords;
  }
}
