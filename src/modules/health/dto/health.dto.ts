import { ApiProperty } from '@nestjs/swagger';

export class HealthDto {
  @ApiProperty({
    description: 'Health status',
    enum: ['ok', 'error', 'unavailable'],
    example: 'ok',
  })
  status!: 'ok' | 'error' | 'unavailable';

  @ApiProperty({
    description: 'Timestamp of health check',
    example: '2024-01-01T00:00:00.000Z',
  })
  timestamp!: string;

  @ApiProperty({
    description: 'Optional message',
    required: false,
    example: 'Service is healthy',
  })
  message?: string;

  @ApiProperty({
    description: 'Server uptime in seconds',
    required: false,
    example: 1234.56,
  })
  uptime?: number;

  @ApiProperty({
    description: 'Node environment',
    required: false,
    example: 'production',
  })
  environment?: string;

  @ApiProperty({
    description: 'API version',
    required: false,
    example: '1.0.0',
  })
  version?: string;

  @ApiProperty({
    description: 'Database status',
    required: false,
    enum: ['connected', 'disconnected', 'pending'],
  })
  database?: 'connected' | 'disconnected' | 'pending';

  @ApiProperty({
    description: 'Service readiness',
    required: false,
    example: true,
  })
  ready?: boolean;

  @ApiProperty({
    description: 'Error message if any',
    required: false,
  })
  error?: string;
}
