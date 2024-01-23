// Helper functions

const keyAlgorithm = {
    name: "AES-GCM",
    length: 256
};

const keyUsages = ["encrypt", "decrypt"];

// Generate secret key (keep it safe!)
const generateKey = window.crypto.subtle.generateKey(
    keyAlgorithm,
    true,
    keyUsages
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

function keyFromText(getText) {
    return getText.then(text => {
        const binary = window.atob(text);
        const bytes = Uint8Array.from(binary, b => b.codePointAt(0));
        return window.crypto.subtle.importKey(
            "raw",
            bytes,
            keyAlgorithm,
            true,
            keyUsages
        );
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

function getTemplate(name) {
    // Sanitise name
    const template = name
        .replaceAll(".", "")
        .replaceAll(":", "");

    return fetch(template + ".mi").then(res => {
        if (!res.ok) {
            throw new Error(`Status: HTTP ${res.status} - Unable to load update.`);
        }
        return res.text();
    });
}

function getHtml(template, info) {
    return mistigri.prrcess(
        template,
        {
            ...info,
            // The following is for demo purposes...
            today: new Date(),
            getDate: o => new Date(o.from),
            isSameMonth: o => (o.a.getMonth() === o.b.getMonth())
        },
        {methodCall: true}
    );
}


// Page data

var user_id = null;
var secure_pii = null;

function savePII(pii, key) {
    const message = JSON.stringify(pii);
    return encryptMessage(message, key).then(encrypted => {
        secure_pii = encrypted;
        return encrypted;
    });
}


// Functions to use in the page

function createAccount(pii) {
    const sendAddRequest = function(secure_pii) {
        // TODO: send data to server
        return Math.floor(Math.random() * 1000000) + 1;
    }

    const openDB = useDB(window.indexedDB.open(dbName, dbVer), true);

    return generateKey.then(key =>
        savePII(pii, key).then(secure_pii =>
            sendAddRequest(secure_pii)
        ).then(id => {
            user_id = id;
            return openDB.then(db =>
                storeSecretKey(db, id, key)
            );
        }
    ));
}

function loadPageUpdate(name, target) {
    //console.log("loadPageUpdate called on: " + target.innerHTML);
    const openDB = useDB(window.indexedDB.open(dbName, dbVer));

    const getPII = openDB.then(db =>
        getSecretKey(db, user_id)
    ).then(key =>
        decryptMessage(secure_pii, key)
    );

    return getTemplate(name).then(template =>
        getPII.then(pii =>
            getHtml(template, {...JSON.parse(pii), id: user_id})
        )
    ).then(html => {
        target.outerHTML = html;
    });
}

function downloadSecretKey() {
    const openDB = useDB(window.indexedDB.open(dbName, dbVer));

    const fileOptions = { suggestedName: `${user_id}.privatekey` };

    return openDB.then(db =>
        keyAsText(getSecretKey(db, user_id))
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
            const blob = new Blob([data], { type: "application/octet-stream" });
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.download = fileOptions.suggestedName;
            link.href = objectUrl;
            link.click();
            link.remove();
            URL.revokeObjectURL(objectUrl);
        }
    });
}

function isUserWithKey(id) {
    const openDB = useDB(window.indexedDB.open(dbName, dbVer));

    return openDB.then(db =>
        getSecretKey(db, id)
    ).then(key =>
        true
    ).catch(e =>
        false
    );
}

function uploadSecretKey(id) {
    const openDB = useDB(window.indexedDB.open(dbName, dbVer), true);

    const fileOptions = {
        types: [{
            description: "Secret Keys",
            accept: {
                "application/*": [".privatekey"]
            }
        }]
    };
    
    if (!!window.showOpenFilePicker) {
        return window.showOpenFilePicker(fileOptions).then(handles =>
            handles[0].getFile()
        ).then(file =>
            keyFromText(file.text())
        ).then(key =>
            openDB.then(db =>
                storeSecretKey(db, id, key)
            )
        );
    }
    else {
        const input = document.createElement("input");
        input.type = "file";
        input.onchange = event => { 
            const file = event.target.files[0]; 
            return keyFromText(file.text()).then(key =>
                openDB.then(db =>
                    storeSecretKey(db, id, key)
                )
            );
        }
        input.click();
        input.remove();
    }
}


// Sample data

createAccount({ firstName: "jido", dob: new Date("1999-01-01") });
