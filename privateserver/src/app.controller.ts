import { Request, Response } from 'express';
import { Controller, Req, Res, Get, Post, Body, Render, Param, Session } from '@nestjs/common';
import { createAccount, getSecurePII, updateTheme } from '../database/src/operations';
import { SecurePII } from '../database/src/entity/Account';
import { promisify } from 'util';

@Controller()
export class AppController {

    @Get()
    @Render('index')
    root(@Req() request: Request) {
        return { theme: request.cookies.theme };
    }

    @Get('logout')
    @Render('index')
    logout(@Req() request: Request, @Session() session: Record<string, any>) {
        session.destroy(e => {
            if (e) {console.log(e)}
        });
        return { theme: request.cookies.theme };
    }
    
    @Get('secrets/:id')
    async secrets(@Param('id') id: number, @Req() req: Request) {
        await new Promise(next =>
            req.session.regenerate(next)
        );
        req.session.user = id;
        return getSecurePII(id);
    }
    
    @Post('create')
    async create(@Body() privateInfo: SecurePII, @Req() req: Request) {
        await new Promise(next =>
            req.session.regenerate(next)
        );
        req.session.user = await createAccount(privateInfo);
        return req.session.user;
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
