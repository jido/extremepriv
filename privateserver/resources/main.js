const keyAlgorithm = {
    name: "AES-GCM",
    length: 256
};

// Generate secret key (keep it safe!)
const generateKey = window.crypto.subtle.generateKey(
    keyAlgorithm,
    true,
    ["encrypt", "decrypt"]
);

function keyAsText(getKey) {
    return getKey.then(key =>
        window.crypto.subtle.exportKey("raw", key)
    ).then(rawKey => {
        const bytes = new Uint8Array(rawKey);
        const data = String.fromCharCode.apply(null, bytes);
        return window.btoa(data);
    });
}

function encryptMessage(message, key) {
    const encoder = new TextEncoder();
    const encodedMsg = encoder.encode(message);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const result = window.crypto.subtle.encrypt(
        { name: keyAlgorithm.name, iv: iv },
        key,
        encodedMsg
    );
    return result.then(encrypted => ({
        iv: iv,
        ciphertext: encrypted
    }));
}

function decryptMessage(input, key) {
    const decoder = new TextDecoder();
    const result = window.crypto.subtle.decrypt(
        { name: keyAlgorithm.name, iv: input.iv },
        key,
        input.ciphertext
    );
    return result.then(decrypted =>
        decoder.decode(decrypted)
    );
}

var secure_pii = null;

function savePII(pii, key) {
    const message = JSON.stringify(pii);
    return encryptMessage(message, key).then(encrypted => {
        secure_pii = encrypted;
        return encrypted;
    });
}

var user_id = null;

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

function createAccount(pii) {
    const sendAddRequest = function(secure_pii) {
        // TODO: send data to server
        return Math.floor(Math.random() * 1000000) + 1;
    }

    const openDB = useDB(window.indexedDB.open(dbName, dbVer), true);

    const storeSecretKey = function(id, key) {
        return openDB.then(db =>
            new Promise((resolve, reject) => {
                const transact = db.transaction(keyStore, "readwrite");
                transact.oncomplete = resolve;

                const addRequest = transact
                    .objectStore(keyStore)
                    .add({ id: id, key: key });

                addRequest.onerror = () => {
                    reject("Saving the new key failed: " + addRequest.error);
                };
            })
        ).catch(message => {
            throw new Error(message);
        });
    }

    return generateKey.then(key =>
        savePII(pii, key).then(secure_pii =>
            sendAddRequest(secure_pii)
        ).then(id => {
            user_id = id;
            return storeSecretKey(id, key);
        }
    ));
}

function getSecretKey(db) {
    return new Promise(resolve => {
        const getRequest = db
            .transaction(keyStore)
            .objectStore(keyStore)
            .get(user_id);

        getRequest.onerror = () => {
            throw new Error("Key not found: " + getRequest.error);
        }

        getRequest.onsuccess = (event) => {
            resolve(event.target.result.key);
        }
    });
}

function loadPageUpdate(name, target) {
    //console.log("loadPageUpdate called on: " + target.innerHTML);
    const getPII = useDB(window.indexedDB.open(dbName, dbVer)).then(db =>
        getSecretKey(db)
    ).then(key =>
        decryptMessage(secure_pii, key)
    );

    const getHtml = function(template) {
        return getPII.then(pii =>
            mistigri.prrcess(
                template,
                {
                    ...JSON.parse(pii),
                    id: user_id,
                    today: new Date(),
                    getDate: o => new Date(o.from),
                    isSameMonth: o => (o.a.getMonth() === o.b.getMonth())
                },
                {methodCall: true}
            )
        );
    }

    const getTemplate = function(name) {
        const template = name.replaceAll(".", "").replaceAll(":", "");    // Sanitise name

        return fetch(template + ".mi").then(res => {
            if (!res.ok) {
                throw new Error(`Status: HTTP ${res.status} - Unable to load update.`);
            }
            return res.text();
        });
    }

    return getTemplate(name).then(template =>
        getHtml(template)
    ).then(html => {
        target.outerHTML = html;
    });
}

function downloadSecretKey() {
    const fileOptions = { suggestedName: `${user_id}.privatekey` };

    return useDB(window.indexedDB.open(dbName, dbVer)).then(db =>
        keyAsText(getSecretKey(db))
    ).then(data => {
        if (!!window.showSaveFilePicker) {
            return window.showSaveFilePicker(fileOptions).then(handle =>
                handle.createWritable()
            ).then(stream =>
                stream.write(data).then(() =>
                    stream.close()
            ));
        }
        else {
            const blob = new Blob([data], { type: 'application/octet-stream' });
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = fileOptions.suggestedName;
            link.href = objectUrl;
            link.click();
            link.remove();
            URL.revokeObjectURL(objectUrl);
        }
    });
}

createAccount({ firstName: "jido", dob: new Date("1999-01-01") });
