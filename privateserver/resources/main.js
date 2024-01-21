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

function fillPersonalInfo() {

    const getSecretKey =
        new Promise(resolve => {
            const saveNewKey = function(db) {
                //console.log("Generating and saving a key...");
                generateKey.then(key => {
                    const addRequest = db
                        .transaction("keys", "readwrite")
                        .objectStore("keys")
                        .add({ algorithm: keyAlgorithm, key: key });
                
                    addRequest.onerror = () =>
                        console.log("Saving the new key failed: " + addRequest.error);
                
                    resolve(key);
                });
            }
        
            const openRequest = window.indexedDB.open("SiteSecrets", 1);
        
            openRequest.onerror = () => resolve(generateKey);  // if database unavailable then make new key
        
            openRequest.onsuccess = (event) => {
                // Get existing key
                console.log("Found previous key store!");
                const db = event.target.result;
                const getRequest = db
                    .transaction("keys")
                    .objectStore("keys")
                    .get(keyAlgorithm.name);
                getRequest.onsuccess = (event) => resolve(event.target.result.key);
                getRequest.onerror = () => saveNewKey(db);  // key not found, create one
            }
        
            openRequest.onupgradeneeded = (event) => {
                // Create database
                console.log("Creating a key store...");
                db = event.target.result;
                db
                    .createObjectStore("keys", { keyPath: "algorithm.name" })
                    .transaction
                    .oncomplete = () => saveNewKey(db);
            };
        });

    const encryptMessage = function(message, key) {
        const enc = new TextEncoder();
        const encoded = enc.encode(message);
        // iv will be needed for decryption
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const result = window.crypto.subtle.encrypt(
                { name: "AES-GCM", iv: iv },
                key,
                encoded,
            );
        return result.then(encrypted => ({
            iv: iv,
            ciphertext: encrypted
        }));
    }

    const savePII = function(pii, key) {
        return key.then(key =>
            encryptMessage(JSON.stringify(pii), key)
        );
    }

    // Encrypted personal identifying information (you can share this)
    const secure_pii = savePII({ 'first-name': "jido", dob: new Date("1999-01-01") }, getSecretKey);

    const decryptMessage = function(input, key) {
        return window.crypto.subtle.decrypt(
          { name: "AES-GCM", iv: input.iv },
          key,
          input.ciphertext
      );
    }

    console.log("Decrypting...");
    const decoder = new TextDecoder();
    return secure_pii.then(secure_pii =>
        getSecretKey.then(key =>
            decryptMessage(secure_pii, key).then(text =>
                JSON.parse(decoder.decode(text), (info, value) => {
                    const targets = document.getElementsByClassName(info);
                    for (var el of targets) {
                        el.innerHTML = value;
                    }
                })
            )));
}