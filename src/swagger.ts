import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

/**
 * Configure and setup Swagger/OpenAPI documentation
 * @param app - NestJS application instance
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Test API')
    .setDescription('NestJS API with Drizzle ORM and PostgreSQL')
    .setVersion('1.0.0')
    .setContact('API Support', 'https://github.com', 'support@example.com')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addTag('health', 'Health check endpoints')
    .addTag('app', 'Application endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayOperationId: true,
    },
    customCss: '.topbar { display: none }',
  });
}
