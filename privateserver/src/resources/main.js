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

function showTab(evt, id) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].classList.add("d-none");
    }
    tablinks = document.getElementsByClassName("tab-link");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(id).className = document.getElementById(id).className.replace(" d-none", "");
    evt.currentTarget.className += " active";
}

function login(id) {
    console.log("login");
    return getPII(id).then(pii => {
        user_id = id;
        secure_pii = pii;
        loadPageUpdate("identity", document.getElementById("main"));
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
            ).then(() => {
                loadPageUpdate("identity", document.getElementById("main"));
            });
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

    const updateState = function(found) {
        document.getElementById("upload-key").disabled = found;
        document.getElementById("key-status").innerHTML = ( found ? "Saved" : "Required for user ID " + id );
        user_id = id;
        return found;
    }

    if (isNaN(id)) {
        document.getElementById("key-status").innerHTML = "";
        return false;
    }
    else {
        return openDB.then(db =>
            containsSecretKey(db, id)
        ).then(updateState)
        .catch(() =>
            updateState(false)
        );
    }
}

function init() {
    const openDB = useDB(window.indexedDB.open(dbName, dbVer));

    return openDB.then(db =>
        lastAccountId(db)
    ).then(id => {
        if (id !== null) {
            document.getElementById('user-id').value = id;
            document.getElementById("key-status").innerHTML = "Saved";
            user_id = id;
        }
    }).catch(() => null);
}

function uploadSecretKey(file) {
    const openDB = useDB(window.indexedDB.open(dbName, dbVer), true);

    if (file) {
        return keyFromText(file.text()).then(key =>
            openDB.then(db =>
                storeSecretKey(db, user_id, key)
            ).then(() => {
                document.getElementById("key-status").innerHTML = "Saved";
            })
        );
    }
}
