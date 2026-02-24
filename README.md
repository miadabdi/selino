<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Database

This project uses Drizzle ORM with PostgreSQL for database management.

### Setup

1. Set your database URL in `.env`:

   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/dbname
   ```

2. Generate and apply migrations:

   ```bash
   # Generate migration from schema
   npm run db:generate

   # Apply migrations to database
   npm run db:migrate

   # Or push schema directly (development only)
   npm run db:push
   ```

3. Launch Drizzle Studio to browse your database:
   ```bash
   npm run db:studio
   ```

For detailed migration workflow and best practices, see [MIGRATIONS.md](./MIGRATIONS.md).

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

### GitHub Actions deployment guide (this repository)

This project deploys from GitHub Actions to an Ubuntu server over SSH.

#### 1) Create deployment user and essential directories on Ubuntu

Run these commands on the server:

```bash
sudo adduser --home /home/sellino --shell /bin/bash sellino
sudo usermod -aG docker sellino
sudo mkdir -p /home/sellino/app
sudo chown -R sellino:sellino /home/sellino
```

Set up SSH key auth for that user:

Create a dedicated SSH key pair for CI/CD deployment (recommended) on your local machine:

```bash
ssh-keygen -t ed25519 -C "github-actions-sellino-deploy" -f ~/.ssh/sellino_deploy
```

Get values:

```bash
# public key (paste into authorized_keys)
cat ~/.ssh/sellino_deploy.pub

# private key (save in GitHub secret DEPLOY_SSH_KEY)
cat ~/.ssh/sellino_deploy
```

Then add the public key to the server user:

```bash
sudo -u sellino mkdir -p /home/sellino/.ssh
sudo -u sellino chmod 700 /home/sellino/.ssh
sudo -u sellino sh -c 'echo "<PASTE_CONTENT_OF_~/.ssh/sellino_deploy.pub>" >> /home/sellino/.ssh/authorized_keys'
sudo -u sellino chmod 600 /home/sellino/.ssh/authorized_keys
```

Then sign in once as `sellino` and verify Docker access:

```bash
sudo -iu sellino
docker ps
```

#### 2) Required files on server

Inside `/home/sellino/app`, keep these files:

- `.env`
- `docker-compose-prod.yml`
- `docker-compose.base.yml`

The workflow deploy path is fixed to `/home/sellino/app`.

#### 3) GitHub secrets

Set these repository secrets:

- `DEPLOY_HOST`: server IP or DNS
- `DEPLOY_USER`: `sellino`
- `DEPLOY_SSH_KEY`: private key for SSH login
- `DEPLOY_PORT`: optional, default `22`
- `DOCKER_USERNAME`: Docker Hub username
- `DOCKER_PASSWORD`: Docker Hub password or access token

#### 4) Immutable image deployment

Deploy workflow uses immutable tag format:

- `stable-<package.json version>`

It does not deploy mutable `latest` tags.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

# selino
