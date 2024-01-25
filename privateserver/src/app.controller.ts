import { Controller, Get, Post, Body, Render, Param } from '@nestjs/common';
import { createAccount, getSecurePII } from '../database/src/operations';
import { SecurePII } from '../database/src/entity/Account';

@Controller()
export class AppController {

    @Get()
    @Render('index')
    root() {
        return { message: "Hello", person: ["jido", "ann", "bob"] };
    }
    
    @Get('secrets/:id')
    secrets(@Param('id') id: string) {
        return getSecurePII(id);
    }
    
    @Post('create')
    create(@Body() privateInfo: SecurePII) {
        return createAccount(privateInfo);
    }
}
