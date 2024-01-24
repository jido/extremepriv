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
