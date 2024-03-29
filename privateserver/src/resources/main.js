// Page data

var user_id = null;
var secure_pii = null;
var selected_theme = null;

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
        tablinks[i].classList.remove("active");
    }
    document.getElementById(id).classList.remove("d-none");
    evt.currentTarget.classList.add("active");
}

function login(id) {
    console.log("login");
    return getPII(id).then(pii => {
        user_id = id;
        secure_pii = pii;
        if (pii.theme) {
            selected_theme = pii.theme;
            loadTheme(selected_theme);
        }
        loadPageUpdate("identity", document.getElementById("main"));
    });
}

function createAccount(pii) {
    const openKeystore = useLocalDB(window.indexedDB.open(dbName, dbVer), true);

    return generateKey.then(key =>
        savePII(pii, key).then(secure_pii =>
            postData("create", {
                iv: bytesAsBase64(secure_pii.iv),
                ciphertext: bytesAsBase64(secure_pii.ciphertext)
            })
        ).then(id => {
            user_id = id;

            return openKeystore.then(ks =>
                storeSecretKey(ks, id, key)
            ).then(() => {
                loadPageUpdate("identity", document.getElementById("main"));
            });
        }
    ));
}

function loadPageUpdate(name, target) {
    //console.log("loadPageUpdate called on: " + target.innerHTML);
    const openKeystore = useLocalDB(window.indexedDB.open(dbName, dbVer));

    const getPII = openKeystore.then(ks =>
        getSecretKey(ks, user_id)
    ).then(key =>
        decryptMessage(secure_pii, key)
    );
    
    const customized = {};
    if (selected_theme) {
        customized[selected_theme] = true;
    }
    return getTemplate(name).then(template =>
        getPII.then(pii =>
            getHtml(template, {
                ...JSON.parse(pii),
                id: user_id,
                customTheme: customized
            })
        )
    ).then(html => {
        target.outerHTML = html;
    });
}

function downloadSecretKey() {
    const openKeystore = useLocalDB(window.indexedDB.open(dbName, dbVer));

    const fileOptions = { suggestedName: `${user_id}.secretkey` };

    return openKeystore.then(ks =>
        keyAsText(getSecretKey(ks, user_id))
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
    const openKeystore = useLocalDB(window.indexedDB.open(dbName, dbVer));

    const updateState = function(found) {
        document.getElementById("upload-key").disabled = found;
        const uploadButton = document.getElementById("upload-key-label");
        if (found) {
            uploadButton.classList.add('disabled'); // Secret key found, it should not be uploaded
        } else {
            uploadButton.classList.remove("disabled");
        }
        document.getElementById("key-status").innerHTML = ( found ? "Saved" : "Required for user ID " + id );
        user_id = id;
        return found;
    }

    if (isNaN(id)) {
        document.getElementById("key-status").innerHTML = "";
        return false;
    }
    else {
        return openKeystore.then(ks =>
            containsSecretKey(ks, id)
        ).then(updateState)
        .catch(() =>
            updateState(false)
        );
    }
}

function init(theme) {
    const openKeystore = useLocalDB(window.indexedDB.open(dbName, dbVer));
    if (theme) {
        selected_theme = theme;
    }

    return openKeystore.then(ks =>
        lastAccountId(ks)
    ).then(id => {
        if (id != null) {
            document.getElementById("user-id").value = id;
            document.getElementById("key-status").innerHTML = "Saved";
            document.getElementById("login-button").click();
            user_id = id;
        }
    }).catch(() => null);
}

function uploadSecretKey(file) {
    const openKeystore = useLocalDB(window.indexedDB.open(dbName, dbVer), true);

    if (file) {
        return keyFromText(file.text()).then(key =>
            openKeystore.then(ks =>
                storeSecretKey(ks, user_id, key)
            ).then(() => {
                document.getElementById("key-status").innerHTML = "Saved";
            })
        );
    }
}
