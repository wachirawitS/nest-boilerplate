import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

export function createOpenApiDocument(
  app: NestExpressApplication,
): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Nest Boilerplate API')
    .setDescription('Modular-monolith REST API starter')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  return SwaggerModule.createDocument(app, config);
}
