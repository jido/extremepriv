import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { mistigriTemplateEngine } from './mistigri-engine';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    app.useStaticAssets(join(__dirname, "..", "resources"));
    app.setBaseViewsDir(join(__dirname, "..", "pages"));
    app.engine('mi', mistigriTemplateEngine);
    app.setViewEngine('mi');
    await app.listen(3000);
}
bootstrap()