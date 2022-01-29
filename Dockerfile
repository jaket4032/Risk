FROM postgres:12
#COPY ./out.sql /docker-entrypoint-initdb.d/
#COPY ./Rocket.toml /var/www/risk/Rocket.toml
COPY ./target/debug/rrserver /var/www/risk/rrserver
ENTRYPOINT /var/www/risk/rrserver
