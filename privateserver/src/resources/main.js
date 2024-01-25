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

function login(id) {
    console.log("login");
    return getPII(id).then(pii => {
        user_id = id;
        secure_pii = pii;
    });
}

function createAccount(pii) {
    const openDB = useDB(window.indexedDB.open(dbName, dbVer), true);

    return generateKey.then(key =>
        savePII(pii, key).then(secure_pii =>
            postData("create", {
                iv: bytesAsBase64(secure_pii.iv),
                ciphertext: bytesAsBase64(secure_pii.ciphertext)
            })
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

    const fileOptions = { suggestedName: `${user_id}.secretkey` };

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
        containsSecretKey(db, id)
    );
}

function uploadSecretKey(id) {
    const openDB = useDB(window.indexedDB.open(dbName, dbVer), true);

    const fileOptions = {
        types: [{
            description: "Secret Keys",
            accept: {
                "application/*": [".secretkey"]
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

function tryUser(id) {
    return isUserWithKey(id).then(yes => {
        if (yes) {
            return login(id);
        }
        else if (id < 100) {
            return tryUser(id + 1);
        }
        else {
            console.log("Too many attempts: " + id);
            return createAccount({ firstName: "jido", dob: new Date("1999-01-01") });
        }
    });
}
tryUser(0);
