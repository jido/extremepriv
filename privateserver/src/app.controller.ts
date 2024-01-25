import { Controller, Get, Post, Body, Render } from '@nestjs/common';
import { createAccount } from '../database/src/operations';
import { SecurePII } from '../database/src/entity/Account';

@Controller()
export class AppController {

    @Get()
    @Render('index')
    root() {
        return { message: "Hello", person: ["jido", "ann", "bob"] };
    }
    
    @Post('create')
    create(@Body() privateInfo: SecurePII) {
        return createAccount(privateInfo);
    }
}
