const dbName = "SiteSecrets";
const dbVer = 2;
const keyStore = "keys";

function useDB(openRequest, forWrite) {
    return new Promise((resolve, reject) => {
        openRequest.onerror = () => {
            reject(openRequest.error);
        }

        openRequest.onsuccess = (event) => {
            resolve(event.target.result);
        }

        openRequest.onupgradeneeded = (event) => {
            if (forWrite) {
                // Create database
                console.log("Creating a key store...");
                const db = event.target.result;
                if ((event.oldVersion < dbVer) && db.objectStoreNames.contains(keyStore)) {
                    console.log("Found an old key store, deleting it.");
                    db.deleteObjectStore(keyStore);
                }
                db
                    .createObjectStore(keyStore, { keyPath: "id" })
                    .transaction
                    .oncomplete = () => resolve(db);
            }
            else {
                reject(`Old key store found (v${event.oldVersion}). Please register again.`);
            }
        }
    });
}

function getSecretKey(db, id) {
    return new Promise((resolve, reject) => {
        const getRequest = db
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

function storeSecretKey(db, id, key) {
    return new Promise((resolve, reject) => {
        const transact = db.transaction(keyStore, "readwrite");
        transact.oncomplete = resolve;

        const addRequest = transact
            .objectStore(keyStore)
            .add({ id: id, key: key });

        addRequest.onerror = () => {
            reject("Saving the key failed: " + addRequest.error);
        }
    });
}
