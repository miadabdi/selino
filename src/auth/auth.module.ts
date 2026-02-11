import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { OtpModule } from "../otp/otp.module.js";
import { UsersModule } from "../users/users.module.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { UserEnrichmentGuard } from "./guards/user-enrichment.guard.js";
import { RefreshTokenService } from "./refresh-token.service.js";
import { GoogleStrategy } from "./strategies/google.strategy.js";
import { JwtStrategy } from "./strategies/jwt.strategy.js";

@Module({
  imports: [
    UsersModule,
    OtpModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: configService.get<string>(
            "JWT_EXPIRES_IN",
            "7d",
          ) as `${number}d`,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    RefreshTokenService,
    JwtStrategy,
    GoogleStrategy,
    UserEnrichmentGuard,
  ],
  exports: [AuthService, RefreshTokenService],
})
export class AuthModule {}
