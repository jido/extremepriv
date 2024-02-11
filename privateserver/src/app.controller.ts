import { Request, Response } from 'express';
import { Controller, Req, Res, Get, Post, Body, Render, Param, Session } from '@nestjs/common';
import { createAccount, getSecurePII, updateTheme } from '../database/src/operations';
import { SecurePII } from '../database/src/entity/Account';
import { promisify } from 'util';

@Controller()
export class AppController {

    @Get()
    @Render('index')
    async root(@Req() request: Request, @Session() session: Record<string, any>) {
        //await promisify(session.destroy)();
        return { theme: request.cookies.theme };
    }
    
    @Get('secrets/:id')
    async secrets(@Param('id') id: number, @Session() session: Record<string, any>) {
        //const sid = await promisify(session.regenerate)();
        session.user = id;
        return getSecurePII(id);
    }
    
    @Post('create')
    async create(@Body() privateInfo: SecurePII, @Session() session: Record<string, any>) {
        //const sid = await promisify(session.regenerate)();
        session.user = createAccount(privateInfo);
        return session.user;
    }
    
    @Get('customize/:theme')
    customize(
        @Param('theme') theme: string,
        @Res({ passthrough: true }) response: Response,
        @Session() session: Record<string, any>
    ) {
        response.cookie('theme', theme, { sameSite: true });
        return updateTheme(theme, session.user);
    }
}
