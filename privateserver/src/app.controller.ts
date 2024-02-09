import { Request, Response } from 'express';
import { Controller, Req, Res, Get, Post, Body, Render, Param } from '@nestjs/common';
import { createAccount, getSecurePII } from '../database/src/operations';
import { SecurePII } from '../database/src/entity/Account';

@Controller()
export class AppController {

    @Get()
    @Render('index')
    root(@Req() request: Request) {
        return { theme: request.cookies.theme };
    }
    
    @Get('secrets/:id')
    secrets(@Param('id') id: number) {
        return getSecurePII(id);
    }
    
    @Post('create')
    create(@Body() privateInfo: SecurePII) {
        return createAccount(privateInfo);
    }
    
    @Get('customize/:theme')
    customize(@Param('theme') theme: string, @Res({ passthrough: true }) response: Response) {
        response.cookie('theme', theme, { sameSite: true });
        return '"ok"';
    }
}
