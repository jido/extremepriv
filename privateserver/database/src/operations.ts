import { AppDataSource } from "./data-source"
import { Account, SecurePII } from "./entity/Account"

AppDataSource.initialize();

export async function createAccount(privateInfo: SecurePII): Promise<number> {
    try {
        console.log("Inserting a new account into the database...");
        const acc = new Account();
        acc.privateinfo = privateInfo;
        await AppDataSource.manager.save(acc);
        console.log("Account id = " + acc.id);
        return acc.id;
    }
    catch(error) {
        console.log(error);
    }
}

export async function getSecurePII(id: number) {
    try {
        console.log("Getting encrypted PII for id " + id);
        const row = await AppDataSource.getRepository(Account).findOneBy({ id: id });
        if (row) {
            return { ...row.privateinfo, theme: row.theme };
        }
    }
    catch(error) {
        console.log(error);
    }
}

export async function updateTheme(theme: string, id: number): Promise<string> {
    try {
        console.log("Setting a theme for id " + id);
        const accounts = AppDataSource.getRepository(Account);
        const row = await accounts.findOneBy({ id: id });
        if (row) {
            row.theme = theme;
            await accounts.update(id, row);
            return '"ok"';
        }
    }
    catch(error) {
        console.log(error);
    }
    return '"error"'
}
