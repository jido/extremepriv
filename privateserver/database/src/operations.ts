import { AppDataSource } from "./data-source"
import { Account, SecurePII } from "./entity/Account"

AppDataSource.initialize();

export async function createAccount(privateInfo: SecurePII) {
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

export async function getSecurePII(id: string) {
    try {
        console.log("Getting encrypted PII for id " + id);
        const row = await AppDataSource.getRepository(Account).findOneBy({ id: parseInt(id) });
        return row.privateinfo;
    }
    catch(error) {
        console.log(error);
    }
}
