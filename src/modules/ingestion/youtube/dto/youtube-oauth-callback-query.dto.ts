import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class YoutubeOauthCallbackQueryDto {
  @ApiProperty({
    description: 'Authorization code returned by Google OAuth.',
    example: '4/0AbUR2...',
  })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({
    description: 'Signed OAuth state payload for YouTube connect.',
  })
  @IsString()
  @IsNotEmpty()
  state!: string;

  @ApiPropertyOptional({
    description: 'Analytics lookback window in days.',
    example: 30,
    minimum: 1,
    maximum: 90,
    default: 30,
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(90)
  days?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of latest videos to pull.',
    example: 10,
    minimum: 1,
    maximum: 10,
    default: 10,
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(10)
  maxVideos?: number;

  @ApiPropertyOptional({
    description: 'OAuth issuer (Google).',
    example: 'https://accounts.google.com',
  })
  @IsOptional()
  @IsString()
  iss?: string;

  @ApiPropertyOptional({
    description: 'Granted scopes from Google OAuth.',
    example: 'email profile https://www.googleapis.com/auth/youtube.readonly',
  })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiPropertyOptional({
    description: 'OAuth account selector index.',
    example: '0',
  })
  @IsOptional()
  @IsString()
  authuser?: string;

  @ApiPropertyOptional({
    description: 'OAuth prompt setting echoed by Google.',
    example: 'consent',
  })
  @IsOptional()
  @IsString()
  prompt?: string;

  @ApiPropertyOptional({
    description: 'OAuth error code, if Google failed the flow.',
    example: 'access_denied',
  })
  @IsOptional()
  @IsString()
  error?: string;

  @ApiPropertyOptional({
    description: 'OAuth error description, if provided by Google.',
  })
  @IsOptional()
  @IsString()
  error_description?: string;
}
