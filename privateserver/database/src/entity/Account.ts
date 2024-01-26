import { Entity, PrimaryGeneratedColumn, Column } from "typeorm"

export class SecurePII {
    iv: string;
    ciphertext: string;
}

@Entity()
export class Account {

    @PrimaryGeneratedColumn()
    id: number

    @Column("simple-json", { name: "private" })
    privateinfo: SecurePII

    @Column({ length: 10, nullable: true })
    theme: string

    @Column("datetime", { default: () => "current_timestamp" })
    lastvisit: Date

}
