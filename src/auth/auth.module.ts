import { forwardRef, Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { OtpModule } from "../otp/otp.module";
import { UsersModule } from "../users/users.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { CaslAbilityFactory } from "./casl/casl-ability.factory";
import { PoliciesGuard } from "./casl/policies.guard";
import { UserEnrichmentGuard } from "./guards/user-enrichment.guard";
import { RefreshTokenRepository } from "./refresh-token.repository";
import { RefreshTokenService } from "./refresh-token.service";
import { GoogleStrategy } from "./strategies/google.strategy";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Global()
@Module({
  imports: [
    forwardRef(() => UsersModule),
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
    RefreshTokenRepository,
    CaslAbilityFactory,
    PoliciesGuard,
    JwtStrategy,
    GoogleStrategy,
    UserEnrichmentGuard,
  ],
  exports: [
    AuthService,
    RefreshTokenService,
    RefreshTokenRepository,
    CaslAbilityFactory,
    PoliciesGuard,
    UserEnrichmentGuard,
  ],
})
export class AuthModule {}
