import { prrcess } from 'mistigri';
import { promises as fs } from 'fs';
import * as escapeHtml from 'escape-html';

async function render(filePath: string, data: any) {
    const template = await fs.readFile(filePath, 'utf8');
    const page = await prrcess(template, data, {escapeFunction: escapeHtml});
    return page;
}

export function mistigriTemplateEngine(filePath: string, data: any, next) {
    return render(filePath, data)
        .then(page => next(null, page))
        .catch(error => next(error));
}