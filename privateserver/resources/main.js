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

function createAccount(pii) {
    const sendAddRequest = function(secure_pii) {
        // TODO: send data to server
        return Math.floor(Math.random() * 1000000) + 1;
    }
    
    const openDB = new Promise(resolve => {
        const openRequest = window.indexedDB.open(dbName, dbVer);

        openRequest.onerror = () => {
            throw new Error("Opening the local database failed: " + openRequest.error);
        }

        openRequest.onsuccess = (event) => {
            resolve(event.target.result);
        }

        openRequest.onupgradeneeded = (event) => {
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
    });

    const storeSecretKey = function(id, key) {
        return openDB.then(db =>
            new Promise(resolve => {
                const transact = db.transaction(keyStore, "readwrite");
                transact.oncomplete = resolve;

                const addRequest = transact
                    .objectStore(keyStore)
                    .add({ id: id, key: key });

                addRequest.onerror = () => {
                    throw new Error("Saving the new key failed: " + addRequest.error);
                }
        }));
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

function loadPageUpdate(name, target) {
    //console.log("loadPageUpdate called on: " + target.innerHTML);
    const openDB = new Promise(resolve => {
        const openRequest = window.indexedDB.open(dbName, dbVer);

        openRequest.onerror = () => {
            throw new Error("Opening the local database failed: " + openRequest.error);
        }

        openRequest.onsuccess = (event) => {
            resolve(event.target.result);
        }

        openRequest.onupgradeneeded = (event) => {
            throw new Error(`Old key store found (v${event.oldVersion}). Please register again.`);
        }
    });

    const getSecretKey = openDB.then(db => 
        new Promise(resolve => {
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
        })
    );

    const getHtml = function(template) {
        return getSecretKey.then(key =>
            decryptMessage(secure_pii, key)
        ).then(pii => 
            mistigri.prrcess(
                template,
                {...JSON.parse(pii), id: user_id, today: new Date(), getDate: o => new Date(o.from), isSameMonth: o => (o.a.getMonth() === o.b.getMonth())},
                {methodCall: true}
            )
        );
    }

    name = name.replaceAll(".", "").replaceAll(":", "");    // Sanitise name

    return fetch(name + ".mi").then(res => {
        if (!res.ok) {
            throw new Error(`Status: HTTP ${res.status} - Unable to load update.`);
        }
        return res.text();
    }).then(template =>
        getHtml(template)
    ).then(html => {
        target.outerHTML = html;
    });
}

createAccount({ firstName: "jido", dob: new Date("1999-01-01") });
