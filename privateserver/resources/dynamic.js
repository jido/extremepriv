function getTemplate(name) {
    // Sanitise name
    const template = name
        .replaceAll(".", "")
        .replaceAll(":", "");

    return window.fetch(template + ".mi").then(res => {
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