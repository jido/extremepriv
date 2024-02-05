function getPII(id) {
    const id_num = parseInt(id) // Make sure it is a number for the demo
    return window.fetch("secrets/" + id_num).then(res => {
        if (!res.ok) {
            throw new Error(`Status: HTTP ${res.status} ${res.statusText} - Unable to load user information.`);
        }

        return res.json().then(payload =>
            ({
                iv: bytesFromBase64(payload.iv),
                ciphertext: bytesFromBase64(payload.ciphertext)
            })
        );
    });
}

function getTemplate(name) {
    // Sanitise name
    const template = name
        .replaceAll(".", "")
        .replaceAll(":", "");

    return window.fetch(template + ".mi").then(res => {
        if (!res.ok) {
            throw new Error(`Status: HTTP ${res.status} ${res.statusText} - Unable to load update.`);
        }
        return res.text();
    });
}

function getHtml(template, info) {
    if (info.dob) {
        // The following is for demo purposes...
        const birthDate = new Date(info.dob);
        info.dob = {
            asDate: birthDate.toLocaleDateString(),
            isThisMonth: new Date().getMonth() === birthDate.getMonth()
        };
    }
    return mistigri.prrcess(
        template,
        info,
        { placeholder: "<unknown>" }
    );
}

function postData(url = "", data = {}) {
    const request = window.fetch(url, {
        method: "POST",
        cache: "no-cache",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
    return request.then(response =>
        response.json()
    );
}

function formJson(form) {
    const values = new FormData(form);
    const result = {};
    for (const [key, value] of values) {
        result[key] = value;
    }
    return result;
}
