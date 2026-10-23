FROM composer:2 AS php-dependencies
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --no-progress --no-scripts --optimize-autoloader
COPY . .
RUN composer dump-autoload --no-dev --optimize

FROM node:22-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY resources ./resources
COPY vite.config.js ./
COPY public ./public
RUN npm run build

FROM php:8.4-cli
WORKDIR /var/www/html
RUN docker-php-ext-install pdo_sqlite
COPY --from=php-dependencies /app ./
COPY --from=frontend /app/public/build ./public/build
RUN mkdir -p storage/framework/cache/data storage/framework/cache/locks storage/framework/sessions storage/framework/views storage/logs storage/app/private \
    && chown -R www-data:www-data storage bootstrap/cache
ENV APP_ENV=production \
    APP_DEBUG=false \
    CACHE_STORE=file \
    SESSION_DRIVER=file \
    LOG_CHANNEL=stderr
USER www-data
EXPOSE 8080
CMD ["sh", "-c", "php artisan aegis:models:train && php artisan serve --host=0.0.0.0 --port=8080"]
