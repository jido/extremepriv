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