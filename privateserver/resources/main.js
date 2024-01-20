// Secret key (keep this safe!)
const key = window.crypto.subtle.generateKey(
  {
    name: "AES-GCM",
    length: 256,
  },
  true,
  ["encrypt", "decrypt"],
);

function encryptMessage(message, key) {
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

function savePII(pii, key) {
    return key.then(key =>
        encryptMessage(JSON.stringify(pii), key)
    );
}

// Encrypted personal identifying information (you can share this)
const secure_pii = savePII({'first-name': "jido", dob: new Date("1999-01-01")}, key);

function decryptMessage(input, key) {
  // The iv value is the same as that used for encryption
  return window.crypto.subtle.decrypt({ name: "AES-GCM", iv: input.iv }, key, input.ciphertext);
}

function fillPersonalInfo() {
    console.log("Decrypting...");
    const decoder = new TextDecoder();
    return secure_pii.then(secure_pii =>
        key.then(key =>
            decryptMessage(secure_pii, key).then(text =>
                JSON.parse(decoder.decode(text), (info, value) => {
                    const targets = document.getElementsByClassName(info);
                    for (var el of targets) {
                        el.innerHTML = value;
                    }
                })
            )));
}