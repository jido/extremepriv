const dbName = "SiteSecrets";
const dbVer = 2;
const keyStore = "keys";

function useLocalDB(openRequest, forWrite) {
    return new Promise((resolve, reject) => {
        openRequest.onerror = () => {
            reject(openRequest.error);
        }

        openRequest.onsuccess = (event) => {
            resolve(event.target.result);
        }

        openRequest.onupgradeneeded = (event) => {
            if (forWrite || event.oldVersion === 0) {
                // Create local database
                console.log("Creating a key store...");
                const localDB = event.target.result;
                if ((event.oldVersion < dbVer) && localDB.objectStoreNames.contains(keyStore)) {
                    console.log("Found an old key store, deleting it.");
                    localDB.deleteObjectStore(keyStore);
                }
                localDB
                    .createObjectStore(keyStore, { keyPath: "id" })
                    .transaction
                    .oncomplete = () => resolve(localDB);
            }
            else {
                reject(`Old key store found (v${event.oldVersion}). Please register again.`);
            }
        }
    });
}

function getSecretKey(localDB, id) {
    return new Promise((resolve, reject) => {
        const getRequest = localDB
            .transaction(keyStore)
            .objectStore(keyStore)
            .get(id);

        getRequest.onerror = () => {
            reject("Key not found: " + getRequest.error);
        }

        getRequest.onsuccess = (event) => {
            resolve(event.target.result.key);
        }
    });
}

function containsSecretKey(localDB, id) {
    return new Promise(resolve =>
        localDB
            .transaction(keyStore)
            .objectStore(keyStore)
            .openCursor(IDBKeyRange.only(id))
            .onsuccess = (event) => {
                resolve(!!event.target.result)
            }
    );
}

function lastAccountId(localDB) {
    return new Promise(resolve =>
        localDB
            .transaction(keyStore)
            .objectStore(keyStore)
            .openCursor(null, "prev")
            .onsuccess = (event) => {
                const result = event.target.result;
                resolve(result ? result.value.id : null);
            }
    );
}

function storeSecretKey(localDB, id, key) {
    return new Promise((resolve, reject) => {
        const transact = localDB.transaction(keyStore, "readwrite");
        transact.oncomplete = resolve;

        const addRequest = transact
            .objectStore(keyStore)
            .add({ id: id, key: key });

        addRequest.onerror = () => {
            reject("Saving the key failed: " + addRequest.error);
        }
    });
}
