import "reflect-metadata"
import { DataSource } from "typeorm"
import { Account } from "./entity/Account"

export const AppDataSource = new DataSource({
    type: "mysql",
    host: "localhost",
    port: 3306,
    username: "extremepriv",
    password: "!!!dev!!!",
    database: "site",
    synchronize: false,
    logging: false,
    entities: [Account],
    migrations: [],
    subscribers: [],
})
