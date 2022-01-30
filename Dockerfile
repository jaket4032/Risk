FROM postgres:12
#COPY ./out.sql /docker-entrypoint-initdb.d/
#COPY ./Rocket.toml /var/www/risk/Rocket.toml
COPY ./static /home/runner/work/Risk/Risk/static
COPY ./target/debug/rrserver /home/runner/work/Risk/Risk/target/debug/rrserver
ENTRYPOINT /home/runner/work/Risk/Risk/target/debug/rrserver
