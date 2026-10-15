FROM php:8.3-apache
RUN docker-php-ext-install pdo_mysql \
    && a2enmod headers \
    && sed -ri 's!/var/www/html!/var/www/html/public!g' /etc/apache2/sites-available/*.conf \
    && printf '<Directory /var/www/html/public>\n  Options -Indexes\n  AllowOverride FileInfo\n  Require all granted\n</Directory>\n' > /etc/apache2/conf-available/starter.conf \
    && a2enconf starter
COPY . /var/www/html/
EXPOSE 80
