/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

use crate::schema::{rollinfo, turninfo};
use diesel::prelude::*;
use diesel::result::Error;
use schemars::JsonSchema;
use serde_json::Value;

#[derive(Serialize)]
pub(crate) struct Turn {
    pub(crate) season: i32,
    pub(crate) day: i32,
    pub(crate) stars: i32,
    pub(crate) mvp: bool,
    pub(crate) territory: String,
    pub(crate) team: String,
}

#[derive(Queryable, Serialize, Deserialize, JsonSchema)]
pub(crate) struct LastTurn {
    pub(crate) season: Option<i32>,
    pub(crate) day: Option<i32>,
    pub(crate) stars: Option<i32>,
}

#[derive(Queryable, Serialize, Deserialize, JsonSchema, Clone, Debug)]
pub(crate) struct PastTurn {
    pub(crate) season: i32,
    pub(crate) day: i32,
    pub(crate) stars: i32,
    pub(crate) mvp: bool,
    pub(crate) territory: String, //should be string
    pub(crate) team: String,      //should be string
}

#[derive(Queryable, Serialize, Deserialize, JsonSchema)]
pub(crate) struct TurnInfo {
    pub(crate) id: i32,
    pub(crate) season: Option<i32>,
    pub(crate) day: Option<i32>,
    pub(crate) complete: Option<bool>,
    pub(crate) active: Option<bool>,
    pub(crate) finale: Option<bool>,
    pub(crate) rollTime: Option<crate::catchers::NaiveDateTime>,
}

#[derive(Queryable, Serialize, Deserialize, JsonSchema, Clone)]
#[allow(unreachable_pub)]
pub struct Latest {
    pub(crate) season: i32,
    pub(crate) day: i32,
}

#[derive(Serialize, Queryable, Deserialize, JsonSchema)]
pub(crate) struct Roll {
    pub(crate) startTime: String,
    pub(crate) endTime: String,
    pub(crate) chaosRerolls: i32,
    pub(crate) chaosWeight: i32,
    pub(crate) territoryRolls: Value,
}

impl TurnInfo {
    pub(crate) fn load(conn: &PgConnection) -> Vec<TurnInfo> {
        turninfo::table
            .select((
                turninfo::id,
                turninfo::season,
                turninfo::day,
                turninfo::complete,
                turninfo::active,
                turninfo::finale,
                turninfo::rollstarttime,
            ))
            .filter(turninfo::complete.eq(true).or(turninfo::active.eq(true)))
            .order_by(turninfo::id)
            .load::<TurnInfo>(conn)
            .expect("Error loading TurnInfo")
    }

    pub(crate) fn loadall(conn: &PgConnection) -> Vec<TurnInfo> {
        turninfo::table
            .select((
                turninfo::id,
                turninfo::season,
                turninfo::day,
                turninfo::complete,
                turninfo::active,
                turninfo::finale,
                turninfo::rollstarttime,
            ))
            .order_by(turninfo::id)
            .load::<TurnInfo>(conn)
            .expect("Error loading TurnInfo")
    }
}

impl Latest {
    pub(crate) fn latest(conn: &PgConnection) -> Result<Latest, String> {
        use diesel::dsl::{max, min};
        let season = turninfo::table
            .select(max(turninfo::season))
            .first::<Option<i32>>(conn);
        match season {
            Ok(season) => {
                let day = turninfo::table
                    .select(min(turninfo::day))
                    .filter(turninfo::season.eq(season.unwrap_or(0)))
                    .filter(turninfo::complete.eq(false))
                    .filter(turninfo::active.eq(true))
                    .first::<Option<i32>>(conn);
                match day {
                    Ok(day) => match (season, day) {
                        (Some(season), Some(day)) => Ok(Latest { season, day }),
                        (Some(season), None) => {
                            let dayz = turninfo::table
                                .select(max(turninfo::day))
                                .filter(turninfo::season.eq(season))
                                .first::<Option<i32>>(conn);
                            let day: i32 = dayz.unwrap_or(Some(0)).unwrap_or(0);
                            Ok(Latest { season, day })
                        }
                        _ => Ok(Latest { season: 0, day: 0 }),
                    },
                    _ => Err("Database Error".to_owned()),
                }
            }
            _ => Err("Database Error".to_owned()),
        }
    }
}

impl Roll {
    pub(crate) fn load(season: i32, day: i32, conn: &PgConnection) -> Result<Roll, Error> {
        rollinfo::table
            .select((
                rollinfo::rollstarttime,
                rollinfo::rollendtime,
                rollinfo::chaosrerolls,
                rollinfo::chaosweight,
                rollinfo::json_agg,
            ))
            .filter(rollinfo::day.eq(day))
            .filter(rollinfo::season.eq(season))
            .first::<Roll>(conn)
    }
}
