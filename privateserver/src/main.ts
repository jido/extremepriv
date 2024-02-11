import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { mistigriTemplateEngine } from './mistigri-engine';
import { join } from 'path';
import { AppModule } from './app.module';
import * as cookies from 'cookie-parser';
import * as session from 'express-session';
import { randomBytes } from 'crypto';

const sessionOptions = {
    resave: false,
    saveUninitialized: false,
    secret: process.env.XPRIV_SESSION_SEC1
        ? [ process.env.XPRIV_SESSION_SEC1, process.env.XPRIV_SESSION_SEC2 ]
        : randomBytes(20).toString("hex"),
    maxAge: 60000,
    cookie: { sameSite: true },
    user: -1
};

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    app.use(cookies());
    app.use(session(sessionOptions));
    app.useStaticAssets(join(__dirname, "..", "resources"));
    app.setBaseViewsDir(join(__dirname, "..", "pages"));
    app.engine('mi', mistigriTemplateEngine);
    app.setViewEngine('mi');
    await app.listen(3000);
}
bootstrap()
