import "reflect-metadata"
import { DataSource } from "typeorm"
import { Account } from "./entity/Account"

export const AppDataSource = new DataSource({
    type: "sqlite",
    database: "site.sq3",
    synchronize: true,
    logging: false,
    entities: [Account],
    migrations: [],
    subscribers: [],
})
