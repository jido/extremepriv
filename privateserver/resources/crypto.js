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

function bytesAsBase64(binary) {
    const rawstr = String.fromCharCode.apply(null, binary)
    return window.btoa(rawstr);
}

function bytesFromBase64(encoded) {
    const rawstr = window.atob(encoded);
    return Uint8Array.from(rawstr, b => b.codePointAt(0));
}

function keyAsText(getKey) {
    return getKey.then(key =>
        window.crypto.subtle.exportKey("raw", key)
    ).then(rawKey =>
        bytesAsBase64(new Uint8Array(rawKey))
    );
}

function keyFromText(getText) {
    return getText.then(text =>
        window.crypto.subtle.importKey(
            "raw",
            bytesFromBase64(text),
            keyAlgorithm,
            true,
            keyUsages
        )
    );
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
        ciphertext: new Uint8Array(encrypted)
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
