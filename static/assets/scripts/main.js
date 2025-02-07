// @license magnet:?xt=urn:btih:3877d6d54b3accd4bc32f8a48bf32ebc0901502a&dn=mpl-2.0.txt Mozilla-Public-2.0
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

//initialize globals
var appInfo = {
  outstandingRequests: [],
  errorNotifications: [],
  rollTime: new Date("January 25, 2022 03:30:00"),
  loadTime: new Date(),
  burger: false,
  burgerTrigger: false,
  teamsObject: null,
  userObject: null,
  lockDisplay: false,
  dDay: new Date("December 23, 2020 04:00:00"),
  fullOpacity: 0,
  map: "/images/map8.svg?v=28",
  viewbox: "00 000 900 902",
  season: 0,
  day: 0,
  mode: 1,
  settings: {
    map_hover: false,
    map_logos: false,
    map_overscroll: false,
    debug: false,
    hide_grocery: false,
    hide_move: false,
    dark_mode: true,
    no_background: false,
  },
};

// Pull the settings if they exist, otherwise set them
var settingsList = appInfo.settings;
try {
  var intermediate = JSON.parse(localStorage.getItem("rr_settings"));
  if (typeof intermediate != "undefined" && intermediate != null) {
    appInfo.settings = intermediate;
  }
  for (setting in settingsList) {
    dbg(setting, settingsList[setting]);
    if (typeof appInfo.settings[setting] === "undefined") {
      appInfo.settings[setting] = settingsList[setting];
    }
  }
  delete intermediate;
} catch {
  dbg("Failed to parse settings. Using default");
}

// Save the settings in case they've been updated
localStorage.setItem("rr_settings", JSON.stringify(appInfo.settings));

if (appInfo.settings.hide_grocery) {
  _("dellogo").classList += "no-before";
}
document.documentElement.setAttribute(
  "data-theme",
  appInfo.settings.dark_mode ? "dark" : "light"
);
document.documentElement.setAttribute(
  "bg-theme",
  appInfo.settings.no_background ? "plain" : "img"
);
if (!appInfo.settings.dark_mode) {
  _("loadicon").setAttribute("src", "/images/logo-black.svg");
}
// Taken from https://stackoverflow.com/questions/11887934/how-to-check-if-dst-daylight-saving-time-is-in-effect-and-if-so-the-offset
Date.prototype.stdTimezoneOffset = function () {
  var jan = new Date(this.getFullYear(), 0, 1);
  var jul = new Date(this.getFullYear(), 6, 1);
  return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
};

Date.prototype.isDstObserved = function () {
  return this.getTimezoneOffset() < this.stdTimezoneOffset();
};

var today = new Date();
hourOffset = 3;
if (today.isDstObserved()) {
  hourOffset = 2;
}
// end of SO code.

appInfo.dDay.setUTCHours(hourOffset);

appInfo.rollTime.setUTCHours(hourOffset, 30, 0, 0);

if (appInfo.rollTime < new Date()) {
  appInfo.rollTime = new Date();
  appInfo.rollTime.setUTCHours(hourOffset, 30, 0, 0);
  if (appInfo.rollTime < new Date()) {
    appInfo.rollTime.setUTCDate(appInfo.rollTime.getUTCDate() + 1);
  }
}

// JS is enabled, so hide that notif
_("error-notif").style.display = "none";

function dbg(statement) {
  if (appInfo.settings.debug == true) {
    console.log(statement);
  }
}

function returnHover() {
  appInfo.lockDisplay = false;
  try {
    _("hover-button").disabled = true;
  } catch {
    _("oddmap_hover-button").disabled = true;
    _("heatmap_hover-button").disabled = true;
  }
  let temptags = document.getElementsByTagName("path");
  for (tt = 0; tt < temptags.length; tt++) {
    temptags[tt].style.fill = temptags[tt].style.fill.replace(
      "-secondary",
      "-primary"
    );
  }
}

// Header Links
// Inspired by https://dev.to/devggaurav/let-s-build-a-responsive-navbar-and-hamburger-menu-using-html-css-and-javascript-4gci

const hamburger = document.querySelector(".hamburger");
const navMenu = document.querySelector(".nav-menu");
const navLink = document.querySelectorAll(".nav-link");

hamburger.addEventListener("click", mobileMenu);
navLink.forEach((n) => n.addEventListener("click", closeMenu));

function mobileMenu() {
  hamburger.classList.toggle("active");
  navMenu.classList.toggle("active");
}

function closeMenu() {
  hamburger.classList.remove("active");
  navMenu.classList.remove("active");
}

// link handling
document.addEventListener(
  "click",
  function (event) {
    switch (event.target.tagName) {
      case "path":
        if (
          appInfo.lockDisplay ||
          event.target.attributes["mapname"].value == "odds" ||
          event.target.attributes["mapname"].value == "heat"
        ) {
          mapDisplayUpdate(event, false, true);
        } else {
          appInfo.lockDisplay = true;
          document.onkeydown = function (evt) {
            evt = evt || window.event;
            if (evt.keyCode == 27) {
              returnHover();
            }
          };
          mapDisplayUpdate(event, false, true);
        }
        //window.history.pushState("Rust Risk", "Rust Risk", '/territory/'.concat(event.target.attributes['name'].value));
        break;
      case "A":
        if (link_is_external(event.target)) return;
        event.preventDefault();
        window.history.pushState("Rust Risk", "Rust Risk", event.target.href);
        break;
      default:
        return;
    }
  },
  false
);

/*_('burger').addEventListener('click', function(event) {
    appInfo.burger = !appInfo.burger;
    appInfo.burgerTrigger = true;
    _('nav').style.display = (appInfo.burger) ? 'flex' : 'none';
});*/

function goToTerritory(territory) {
  window.history.pushState(
    "Rust Risk",
    "Rust Risk",
    "/territory/".concat(territory)
  );
}

//request handling
function doAjaxGetRequest(
  url,
  source,
  callback,
  errorcallback = defaultErrorNotif
) {
  var instance_index = addUrlFromRequests(source, url);
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      if (typeof callback == "function") {
        try {
          callback(this);
        } catch (err) {
          dbg("Error with callback function");
          dbg(err);
        }
      } else {
        return JSON.parse(this.response);
      }
      updateUrlFromRequests(instance_index, 1);
      // return JSON.parse(this.response);
    } else if (this.readyState == 4 && this.status != 200) {
      globalError = true;
      errorcallback(this);
      updateUrlFromRequests(instance_index, 1);
      //document.getElementsById("loadicon").classList.add("blink");
    }
  };
  xhttp.open("GET", url, true);
  xhttp.send();
}

function addUrlFromRequests(source, url) {
  var index =
    appInfo.outstandingRequests.push({ source: source, url: url, state: 0 }) -
    1;
  updateLoaderVisibility();
  return index;
}

function updateUrlFromRequests(index, status) {
  if (index > -1) {
    appInfo.outstandingRequests[index].state = status;
  }
  updateLoaderVisibility();
}

function updateLoaderVisibility(forceHide = false) {
  let pending = false;
  for (i in appInfo.outstandingRequests) {
    if (appInfo.outstandingRequests[i].state == 0) {
      pending = true;
      break;
    }
  }
  if (!pending && !forceHide) {
    //stop loader
    _("loadicon").classList.remove("spin");
  } else {
    //start loader
    //check if globalError
    _("loadicon").classList.add("spin");
  }
}

/*** Error Notifications ***/

function errorNotif(
  title,
  body,
  button1,
  button2,
  resolveself = true,
  skipnotifcheck = false,
  errorIndex = 0
) {
  if (skipnotifcheck != true) {
    errorIndex =
      appInfo.errorNotifications.push({
        title: title,
        body: body,
        button1: button1,
        button2: button2,
        status: 1,
        resolveself: resolveself,
      }) - 1;
  }
  let vset = appInfo.errorNotifications[errorIndex - 1] || { status: 0 };
  if (vset.status == 0) {
    _("error-notif").style.display = "block";
    _("error-notif-title").innerHTML = title || "General Error";
    _("error-notif-body").innerHTML =
      body ||
      'Hmm, no error was specified. Try notifying <a href="https://github.com/mautamu/risk">u/Mautamu</a> if this issue persists.';
    _("error-notif-button-1").innerHTML = button1.text || "";
    _("error-notif-button-1-container").style.display =
      button1.display || "block";
    _("error-notif-button-1").onclick = function () {
      try {
        if (typeof button1.action == "function") {
          button1.action();
        }
        if (resolveself) {
          appInfo.errorNotifications[errorIndex].status = 0;
        }
      } finally {
        errorOver(errorIndex);
      }
    };
    _("error-notif-button-2").innerHTML = button2.text || "";
    _("error-notif-button-2-container").style.display =
      button2.display || "block";
    _("error-notif-button-2").onclick = function () {
      try {
        if (typeof button2.action == "function") {
          button2.action();
        }
        if (resolveself) {
          appInfo.errorNotifications[errorIndex].status = 0;
        }
      } finally {
        errorOver(errorIndex);
      }
    };
  }
}

function errorOver(errorIndex) {
  if (appInfo.errorNotifications[errorIndex].status == 0) {
    //move to next one or hide
    let pending = false;
    for (i in appInfo.errorNotifications) {
      if (appInfo.errorNotifications[i].status != 0) {
        pending = true;
        errorNotif(
          appInfo.errorNotifications[i].title,
          appInfo.errorNotifications[i].body,
          appInfo.errorNotifications[i].button1,
          appInfo.errorNotifications[i].button2,
          appInfo.errorNotifications[i].resolveself,
          true,
          i
        );
        break;
      }
    }
    if (!pending) {
      _("error-notif").style.display = "none";
    }
  } else {
    //do nothing
  }
}

function defaultErrorNotif(data) {
  errorNotif(
    "Fetch Error",
    '<h1>Howdy partner</h1>, unfortunately we encountered an error. Not sure what it\'s about. <br/><br/> If this keeps occuring, please <a href="mailto:mautam@usa.com">email us.</a>',
    {
      text: "Okay",
      action: function () {},
    },
    {
      display: "none",
      action: function () {},
    }
  );
}

function drawPlayerCard(userObject, teamObject) {
  var template = _("templatePlayerCard");

  var templateHtml = template.innerHTML;

  var listHtml = "";
  var index = 0;
  for (i in appInfo.teamsObject) {
    if (appInfo.teamsObject[i].name == teamObject.team) {
      index = i;
    }
  }
  listHtml += templateHtml
    .replace(/{{user_name}}/g, userObject.name)
    .replace(/{{user_team_color}}/, userObject.team.colors.primary)
    .replace(/{{overall}}/g, "✯".repeat(userObject.ratings.overall))
    .replace(
      /{{total_turns_stars}}/g,
      "✯".repeat(userObject.ratings.totalTurns)
    )
    .replace(/{{round_turns_stars}}/g, "✯".repeat(userObject.ratings.gameTurns))
    .replace(/{{mvps_stars}}/g, "✯".repeat(userObject.ratings.mvps))
    .replace(/{{streak_stars}}/g, "✯".repeat(userObject.ratings.streak))
    .replace(/{{cfb_stars_stars}}/g, "✯".repeat(userObject.ratings.awards))
    .replace(/{{total_turns}}/g, userObject.stats.totalTurns)
    .replace(/{{round_turns}}/g, userObject.stats.gameTurns)
    .replace(/{{mvps}}/g, userObject.stats.mvps)
    .replace(/{{streak}}/g, userObject.stats.streak)
    .replace(/{{cfb_stars}}/g, userObject.stats.awards)
    .replace(/{{team}}/g, teamObject.team || "")
    .replace(
      /{{team_2}}/g,
      userObject.active_team.name != userObject.team.name
        ? "Playing as " + userObject.active_team.name || ""
        : ""
    )
    .replace(/{{team_players_yesterday}}/g, teamObject.players || "0")
    .replace(/{{team_mercs_yesterday}}/g, teamObject.mercs || "0")
    .replace(/{{team_star_power_yesterday}}/g, teamObject.stars || "0")
    .replace(/{{team_territories_yesterday}}/g, teamObject.territories || "0")
    .replace(/{{team_logo}}/g, appInfo.teamsObject[index].logo || "0");
  _("playerCard").innerHTML = listHtml;
}

/*** Get Data Fxs ***/
function getUserInfo(resolve, reject) {
  try {
    doAjaxGetRequest(
      "/api/me",
      "UserLoader",
      function (userObject) {
        dbg("Making req");
        appInfo.userObject = JSON.parse(userObject.response);
        //see if user has a team, if not, prompt them and halt
        let active_team = appInfo.userObject.active_team || {
          name: null,
        };
        if (active_team.name == null) {
          //select a new team 4 the season! whoohoo!
          if (appInfo.userObject.team == null) {
            //select a team in general!! whoohoo!
            select_team =
              '<p>Welcome! <br/> To get started, you will need to select a team.</p><form action="auth/join" method="GET" id="team-submit-form"> <select name="team" id="team">';
            season = window.turnsObject[window.turnsObject.length - 1].season;
            approved_teams = [];
            for (n = 0; n < window.territories.length; n++) {
              if (!approved_teams.includes(window.territories[n].owner)) {
                approved_teams.push(window.territories[n].owner);
              }
            }

            appInfo.teamsObject.forEach(function (team) {
              if (
                team.seasons.includes(season) &&
                team.name != "Unjoinable Placeholder" &&
                approved_teams.includes(team.name)
              ) {
                select_team +=
                  '<option name="team" value="' +
                  team.id +
                  '">' +
                  team.name +
                  "</option>";
              }
            });
            select_team +=
              '</select><div id="team-submit-form-error"></div></form>';
            errorNotif(
              "Select a Team",
              select_team,
              {
                text: "Join",
                action: function () {
                  doAjaxGetRequest(
                    encodeURI("/auth/join?team=".concat(_("team").value)),
                    "TeamSelector",
                    function (status) {
                      if (status.status == 200) {
                        location.reload();
                      }
                    },
                    function (status) {
                      if (status.status == 409) {
                        //user has team,
                      } else if (status.status == 403) {
                        //team has no territories!
                        _("team-submit-form-error").innerHTML =
                          '<br/><br/> <b style="color:red;">Sorry, but this team is out of the running. Try another.</b>';
                      } else {
                        _("team-submit-form-error").innerHTML =
                          '<br/><br/><b style="red">Hmm, something went wrong. Try again?</b>';
                      }
                    }
                  );
                },
              },
              {
                display: "none",
                action: function () {},
              }
            );
          } else {
            //oh no! your team has been e l i m i n a t e d
            dbg("Elimed");
            select_team =
              '<p>Oh no! Your team has been <b>eliminated.</b> Select a new one to play as: </p><form action="auth/join" method="GET" id="team-submit-form"> <select name="team" id="team">';
            approved_teams = [];
            season = window.turnsObject[window.turnsObject.length - 1].season;
            for (n = 0; n < window.territories.length; n++) {
              if (!approved_teams.includes(window.territories[n].owner)) {
                approved_teams.push(window.territories[n].owner);
              }
            }
            appInfo.teamsObject.forEach(function (team) {
              if (
                team.seasons.includes(season) &&
                team.name != "Unjoinable Placeholder" &&
                approved_teams.includes(team.name)
              ) {
                select_team +=
                  '<option name="team" value="' +
                  team.id +
                  '">' +
                  team.name +
                  "</option>";
              }
            });
            select_team +=
              '</select><div id="team-submit-form-error"></div></form>';
            errorNotif(
              "Select a Team",
              select_team,
              {
                text: "Join",
                action: function () {
                  doAjaxGetRequest(
                    encodeURI("/auth/join?team=".concat(_("team").value)),
                    "TeamSelector",
                    function (status) {
                      if (status.status == 200) {
                        location.reload();
                      }
                    },
                    function (status) {
                      if (status.status == 409) {
                        //user has team,
                      } else if (status.status == 403) {
                        //team has no territories!
                        _("team-submit-form-error").innerHTML =
                          '<br/><br/> <b style="color:red;">Sorry, but this team is out of the running. Try another.</b>';
                      } else {
                      }
                    }
                  );
                },
              },
              {
                display: "none",
              }
            );
          }
          reject("No team");
        } else {
          doAjaxGetRequest(
            encodeURI(
              "/api/stats/team?team=".concat(appInfo.userObject.team.name)
            ).replace(/&/, "%26"),
            "TeamLoader",
            function (teamObject) {
              drawPlayerCard(
                appInfo.userObject,
                JSON.parse(teamObject.response)
              );
              resolve("Okay");
            },
            function () {
              reject("Error");
            }
          );
        }
      },
      function () {
        //display reddit login info
        _("playerCard").classList.add("redditlogin");
        _("reddit-login-top").style.display = "flex";
        _("playerCard").innerHTML =
          '<li><a href="/login/reddit"><div style="margin-top:50%;" ><img alt="reddit logo" src="images/reddit-logo.png"><br/><br/>LOGIN</div></a></li>';
        _("roll-container").innerHTML = _("playerCard").outerHTML;
        resolve("Okay");
      }
    );
  } catch {
    reject("Error setting up user card");
  }
}

function mapDisplayUpdate(event, change, override = false) {
  if (!appInfo.lockDisplay || override) {
    twid = "hover-button";
    var prefix = "";
    var leaderboard = false;
    switch (event.target.attributes["mapname"].value) {
      // This is a lazy way of doing this, in the future this entire function should be remapped for different map types
      case "odds":
        prefix = "oddmap_" + prefix;
        _("moveable-info").style.left = event.clientX + 60 + "px";
        _("moveable-info").style.top = event.clientY + "px";
        break;
      case "heat":
        _("moveable-info").style.left = event.clientX + 60 + "px";
        _("moveable-info").style.top = event.clientY + "px";
        prefix = "heatmap_" + prefix;
        break;
      case "leaderboard":
        _("moveable-info").style.left = event.pageX + 60 + "px";
        _("moveable-info").style.top = event.pageY + "px";
        leaderboard = true;
      default:
        _("moveable-info").style.left = event.pageX + 60 + "px";
        _("moveable-info").style.top = event.pageY + "px";
        break;
    }
    // code block
    // All
    _("map-county-info").innerHTML = event.target.attributes["name"].value;
    try {
      _("map-owner-info").innerHTML =
        "Owner:  " +
        event.target.attributes["owner"].value +
        "<br />Region: " +
        event.target.attributes["region"].value;
    } catch {}
    _("moveable-info").style.display = "block";
    // heat/odds only:
    twid = prefix + twid;
    if (prefix == "") {
      try {
        if (
          appInfo.attackable_territory_names.includes(
            event.target.attributes["name"].value
          )
        ) {
          _("attack-button").disabled = false;
          _("attack-button").onclick = function () {
            makeMove(event.target.attributes["territoryid"].value);
          };
        } else {
          _("attack-button").disabled = true;
        }
        if (
          appInfo.defendable_territory_names.includes(
            event.target.attributes["name"].value
          )
        ) {
          _("defend-button").disabled = false;
          _("defend-button").onclick = function () {
            makeMove(event.target.attributes["territoryid"].value);
          };
        } else {
          _("defend-button").disabled = true;
        }
      } catch {
        //user not logged in. Oh well..
      }

      _("visit-button").disabled = false;
      _("visit-button").onclick = function () {
        goToTerritory(event.target.attributes["name"].value);
      };
    }
    if (leaderboard) {
      _("map-county-info").innerHTML = event.target.attributes["name"].value;
      _("map-owner-info").innerHTML =
        "Owner:  " +
        event.target.attributes["owner"].value +
        "<br /> Power: " +
        event.target.attributes["power"].value +
        " Players: " +
        event.target.attributes["players"].value;
      _("visit-button").disabled = false;
      _("visit-button").onclick = function () {
        goToTerritory(event.target.attributes["name"].value);
      };
    }

    if (override) {
      let temptags = document.getElementsByTagName("path");
      for (tt = 0; tt < temptags.length; tt++) {
        temptags[tt].style.fill = temptags[tt].style.fill.replace(
          "-secondary",
          "-primary"
        );
      }
      _(twid).disabled = false;
    }
    if (change) {
      event.target.style.fill = event.target.style.fill.replace(
        "-secondary",
        "-primary"
      );
    } else {
      event.target.style.fill = event.target.style.fill.replace(
        "-primary",
        "-secondary"
      );
    }
  }
}

function regionsNBridgesInit() {
  //if main map
  appInfo.regionsDisplay = false;
  appInfo.bridgesDisplay = false;
  //if odds/heat map
  appInfo.regionsDisplayOdds = false;
  appInfo.bridgesDisplayOdds = false;
  try {
    _("regions-button").onclick = function () {
      handleRegions();
    };
    _("bridges-button").onclick = function () {
      handleBridges();
    };
  } catch {
    _("oddmap_regions-button").onclick = function () {
      handleRegions();
    };
    _("oddmap_bridges-button").onclick = function () {
      handleBridges();
    };
    _("heatmap_regions-button").onclick = function () {
      handleRegions();
    };
    _("heatmap_bridges-button").onclick = function () {
      handleBridges();
    };
  }
}

function handleRegions() {
  try {
    appInfo.regionsDisplay = !appInfo.regionsDisplay;
    _("Regions").style.display = appInfo.regionsDisplay ? "flex" : "none";
  } catch {
    appInfo.regionsDisplayOdds = !appInfo.regionsDisplayOdds;
    _("oddmap_Regions").style.display = appInfo.regionsDisplayOdds
      ? "flex"
      : "none";
    _("heatmap_Regions").style.display = appInfo.regionsDisplayOdds
      ? "flex"
      : "none";
  }
}

function handleBridges() {
  try {
    try {
      appInfo.bridgesDisplay = !appInfo.bridgesDisplay;
      _("Bridges").style.display = appInfo.bridgesDisplay ? "flex" : "none";
    } catch {
      appInfo.bridgesDisplayOdds = !appInfo.bridgesDisplayOdds;
      _("oddmap_Bridges").style.display = appInfo.bridgesDisplayOdds
        ? "flex"
        : "none";
      _("heatmap_Bridges").style.display = appInfo.bridgesDisplayOdds
        ? "flex"
        : "none";
    }
  } catch {
    alert("Sorry, there ain't none!");
  }
}

function mapHover(event) {
  if (!event.target.matches("path") && appInfo.lockDisplay == true) return;
  else if (
    !event.target.matches("path") &&
    appInfo.lockDisplay == false &&
    !appInfo.settings.map_hover
  ) {
    try {
      _("moveable-info").style.display = "none";
    } catch {}
    return;
  }
  if (event.target.attributes["id"].value.toLowerCase().indexOf("region") != -1)
    return;
  type = event.type;
  switch (type) {
    case "mouseover":
      event.preventDefault();
      mapDisplayUpdate(event, false);
      break;
    case "mouseout":
      event.preventDefault();
      mapDisplayUpdate(event, true);
      break;
    default:
      break;
  }
}

function setupMapHover(resolve, reject) {
  document.addEventListener("mouseover", mapHover, false);
  document.addEventListener("mouseout", mapHover, false);
  resolve(true);
}

function removeMapHover(resolve, reject) {
  document.removeEventListener("mouseover", mapHover, false);
  document.removeEventListener("mouseout", mapHover, false);
  resolve(true);
}

function getTeamInfo(resolve, reject) {
  try {
    doAjaxGetRequest(
      "/api/teams",
      "Teams",
      function (team_data) {
        appInfo.teamsObject = JSON.parse(team_data.response);
        dbg(appInfo.teamsObject);
        for (team in appInfo.teamsObject) {
          document.documentElement.style.setProperty(
            "--"
              .concat(appInfo.teamsObject[team].name.replace(/\W/g, ""))
              .concat("-primary"),
            appInfo.teamsObject[team].colors.primary
          );
          document.documentElement.style.setProperty(
            "--"
              .concat(appInfo.teamsObject[team].name.replace(/\W/g, ""))
              .concat("-secondary"),
            appInfo.teamsObject[team].colors.secondary
          );
        }
        resolve(appInfo.teamsObject);
      },
      function () {
        reject("Error");
      }
    );
  } catch {
    reject("Error loading team info");
  }
}

function getTurns(resolve, reject) {
  try {
    doAjaxGetRequest(
      "/api/turns",
      "Turns",
      function (team_data) {
        window.turnsObject = JSON.parse(team_data.response);
        //appInfo.rollTime = new Date(window.turnsObject[window.turnsObject.length - 1].rollTime + "Z");
        window.turn = window.turnsObject[window.turnsObject.length - 1];
        resolve(window.turnsObject);
      },
      function () {
        reject("Error");
      }
    );
  } catch {
    reject("Error loading team info");
  }
}

function makeMove(id) {
  appInfo.doubleOrNothing = false;
  if (appInfo.defendable_territory_names.length == 1) {
    //Prompt the player if they want to double or nothing their move
    doubleOrNothingText = window.prompt(
      "Type YES to triple-or-nothing your move's power. Otherwise type NO."
    );
    appInfo.doubleOrNothing = doubleOrNothingText.toLowerCase() == "yes";
  }
  let endCycleColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--theme-bg")
    .concat("");
  let endCycleColor05 = getComputedStyle(document.documentElement)
    .getPropertyValue("--theme-bg-05")
    .concat("");
  document.documentElement.style.setProperty("--theme-bg", "rgba(255,0,255,1)");
  document.documentElement.style.setProperty(
    "--theme-bg-05",
    "rgba(255,0,255,0.5)"
  );
  var timeStamp = Math.floor(Date.now() / 1000); //use timestamp to override cache
  doAjaxGetRequest(
    "/auth/move?target=".concat(
      id,
      "&timestamp=",
      timeStamp.toString(),
      "&aon=",
      appInfo.doubleOrNothing
    ),
    "Make Move",
    function () {
      document.documentElement.style.setProperty("--theme-bg", endCycleColor);
      document.documentElement.style.setProperty(
        "--theme-bg-05",
        endCycleColor05
      );
      doAjaxGetRequest("/auth/my_move", "Load Move", function (data) {
        highlightTerritory(
          data.response.normalize("NFD").replace(/[\u0300-\u036f ]/g, "")
        );
        errorNotif(
          "Move Submitted",
          "Your move was on territory <b>{{Territory}}</b>.".replace(
            /{{Territory}}/,
            appInfo.settings.hide_move
              ? "[[Hidden by settings]]"
              : data.response
          ),
          {
            text: "Okay",
          },
          {
            display: "none",
          }
        );
      });
      return 0;
    },
    function () {
      document.documentElement.style.setProperty(
        "--theme-bg",
        "rgba(255,0,0,1)"
      );
      document.documentElement.style.setProperty(
        "--theme-bg-05",
        "rgba(255,0,0,0.5)"
      );
      errorNotif(
        "Could not make move",
        "Hmm, couldn't set that as your move for the day.",
        {
          text: "Okay",
        },
        {
          display: "none",
        }
      );
    }
  );
}

function drawActionBoardSheet(resolve, reject) {
  let territories = window.territories;
  if (window.turnsObject[window.turnsObject.length - 1].finale) {
    _("last-day-notice").innerHTML = "Today is the final roll! Make it count!";
  }
  if (!window.turnsObject[window.turnsObject.length - 1].active) {
    _("last-day-notice").innerHTML =
      "This season is over. Thank you for playing!";
    appInfo.attackable_territory_names = [];
    appInfo.defendable_territory_names = [];
    dbg("AC1");
    _("action-container").outerHTML =
      '<iframe title="Poll" src="https://docs.google.com/forms/d/e/1FAIpQLSdgFLw31qP-ZuDsjcKGQuPn6mIBIOXRir84qzkmSNWXr3RWJg/viewform?embedded=true" width="640" height="2903" frameborder="0" marginheight="0" marginwidth="0">Loading…</iframe>';
  } else {
    try {
      dbg("Drawing Actions.");
      let userteam = appInfo.userObject.active_team.name;
      dbg(userteam);
      appInfo.attackable_territories = {};
      appInfo.attackable_territory_names = [];
      appInfo.defendable_territories = {};
      appInfo.defendable_territory_names = [];
      dbg(territories);
      for (i in territories) {
        if (territories[i].owner == userteam) {
          neighbors = 0;
          for (j in territories[i].neighbors) {
            if (territories[i].neighbors[j].owner != userteam) {
              appInfo.attackable_territories[territories[i].neighbors[j].id] =
                territories[i].neighbors[j];
              appInfo.attackable_territory_names.push(
                territories[i].neighbors[j].name
              );
              neighbors += 1;
            }
          }
          if (neighbors != 0) {
            appInfo.defendable_territories[territories[i].id] = territories[i];
            appInfo.defendable_territory_names.push(territories[i].name);
          }
        }
      }
      dbg("AC2");
      _("action-container").style.display = "flex";
      let action_item =
        '<label for="{{id}}">{{name}}:</label> <input type="number" id="ac_{{id}}" name="ac_{{id}}" class="pointcount" value="0" min="0" max="100"> <br/>';
      for (k in appInfo.attackable_territories) {
        _("attack-list").innerHTML += action_item
          .replace(/{{name}}/g, appInfo.attackable_territories[k].name)
          .replace(/{{id}}/g, appInfo.attackable_territories[k].id);
      }
      for (l in appInfo.defendable_territories) {
        _("defend-list").innerHTML += action_item
          .replace(/{{name}}/g, appInfo.defendable_territories[l].name)
          .replace(/{{id}}/g, appInfo.defendable_territories[l].id);
      }
      _("sender").style.display = "block";
      _("max_points_available").value = "0";

      dbg("Territory actions drawn");
      resolve("Okay");
    } catch (error) {
      dbg("could not do territory analysis");
      dbg(error);
      reject("Error");
    }
  }
}

function sumInNums() {
  let to_sum = Array.from(document.getElementsByClassName("pointcount"));
  let sum = 0;
  for (i = 0; i < to_sum.length; i++) {
    if (!isNaN(to_sum[i].value)) {
      sum += Number(to_sum[i].value);
    }
  }
  return sum;
}

function drawActionBoard(resolve, reject) {
  let territories = window.territories;
  if (window.turnsObject[window.turnsObject.length - 1].finale) {
    _("last-day-notice").innerHTML = "Today is the final roll! Make it count!";
  }
  if (!window.turnsObject[window.turnsObject.length - 1].active) {
    _("last-day-notice").innerHTML =
      "This season is over. Thank you for playing!";
    appInfo.attackable_territory_names = [];
    appInfo.defendable_territory_names = [];
    dbg("AC3");
    _("action-container").outerHTML =
      '<iframe title="Poll" src="https://docs.google.com/forms/d/e/1FAIpQLSdgFLw31qP-ZuDsjcKGQuPn6mIBIOXRir84qzkmSNWXr3RWJg/viewform?embedded=true" width="640" height="2903" frameborder="0" marginheight="0" marginwidth="0">Loading…</iframe>';
  } else {
    try {
      dbg("Drawing Actions.");
      let userteam = appInfo.userObject.active_team.name;
      dbg(userteam);
      appInfo.attackable_territories = {};
      appInfo.attackable_territory_names = [];
      appInfo.defendable_territories = {};
      appInfo.defendable_territory_names = [];
      dbg(territories);
      for (i in territories) {
        if (territories[i].owner == userteam) {
          neighbors = 0;
          for (j in territories[i].neighbors) {
            if (territories[i].neighbors[j].owner != userteam) {
              appInfo.attackable_territories[territories[i].neighbors[j].id] =
                territories[i].neighbors[j];
              appInfo.attackable_territory_names.push(
                territories[i].neighbors[j].name
              );
              neighbors += 1;
            }
          }
          if (neighbors != 0) {
            appInfo.defendable_territories[territories[i].id] = territories[i];
            appInfo.defendable_territory_names.push(territories[i].name);
          }
        }
      }
      dbg("AC4");
      _("action-container").style.display = "flex";
      let action_item = '<button onclick="makeMove({{id}});">{{name}}</button>';
      for (k in appInfo.attackable_territories) {
        _("attack-list").innerHTML += action_item
          .replace(/{{name}}/g, appInfo.attackable_territories[k].name)
          .replace(/{{id}}/g, appInfo.attackable_territories[k].id);
      }
      for (l in appInfo.defendable_territories) {
        _("defend-list").innerHTML += action_item
          .replace(/{{name}}/g, appInfo.defendable_territories[l].name)
          .replace(/{{id}}/g, appInfo.defendable_territories[l].id);
      }
      dbg("Territory actions drawn");
      resolve("Okay");
    } catch (error) {
      dbg("could not do territory analysis");
      dbg(error);
      reject("Error");
    }
  }
}

function resizeMap() {
  //_('map').setAttribute('preserveAspectRatio', 'xMinYMin');
  //_('map').setAttribute('viewBox', appInfo.viewbox);
  //appInfo.panZoomMap.updateBBox();
  appInfo.panZoomMap.resize();
  /*    let width = _('map-container').clientWidth;
          if (width < 1000) {
              _('map').setAttribute('width', width);
              _('map').setAttribute('height', width);
          }*/
  /*try {
          _('map').setAttribute('preserveAspectRatio', 'xMinYMin');
          _('map').setAttribute('viewBox', appInfo.viewbox);
      } catch {
          try {
              _('heatmap_map').setAttribute('preserveAspectRatio', 'xMinYMin');
              _('heatmap_map').setAttribute('viewBox', appInfo.viewbox);
              _('oddmap_map').setAttribute('preserveAspectRatio', 'xMinYMin');
              _('oddmap_map').setAttribute('viewBox', appInfo.viewbox);
              /* _('heatmap_map').style.height = "100vw";
               _('heatmap_map').style.width = "100vw";
               _('oddmap_map').style.height = "100vw";
               _('oddmap_map').style.width = "100vw";*/
  //} catch { dbg("No map detected."); }
  //  }
}

function seasonDayObject(season = 0, day = 0, autoup = false, fn, turnsObject) {
  //TODO: implement season stuff plz
  opt =
    '<option value="{{val}}" {{sel}}>Season {{season}}, Day {{day}}</option>';
  days =
    '<select onchange="' +
    fn +
    '(this.value); " name="day_select" id="day_select">';
  for (turnb in turnsObject) {
    if (turnb == 0) {
      continue;
    }
    turn = turnsObject.length - turnb - 1;
    sel =
      (turnsObject[turn].season == season && turnsObject[turn].day == day) ||
      (day == 0 && turn == turnsObject.length - 1)
        ? "selected"
        : "";
    days += opt
      .replace(
        /{{val}}/gi,
        turnsObject[turn].season + "." + turnsObject[turn].day
      )
      .replace(/{{sel}}/, sel)
      .replace(/{{season}}/, turnsObject[turn].season)
      .replace(/{{day}}/, turnsObject[turn].day);
  }
  days += "</select>";
  if (autoup == false) {
    return "{{day}}".replace(/{{day}}/, days);
  } else {
    //yay! time to redraw stuffs:
    _("day_select").outerHTML = days;
  }
}

function drawMap(resolve, reject, source = "territories", season = 0, day = 0) {
  // source should be either 'heat' or 'territories'
  var addendum =
    season > 0 && day > 0 ? "?season=" + season + "&day=" + day : "";
  doAjaxGetRequest(appInfo.map, "Map", function (data) {
    _("map-container").innerHTML = data.response;
    //now to fetch territory ownership or heat data
    switch (source) {
      case "heat":
        doAjaxGetRequest(
          "/api/heat" + addendum,
          "Heat",
          function (heat_data) {
            heat = JSON.parse(heat_data.response);
            // find maximum
            maxmin = getMaxMin(heat, "power");
            for (territory in heat) {
              //red = Math.round(160 + 200 * (heat[territory].power - maxmin[1].power) / (maxmin[0].power - maxmin[1].power)) | 60;
              _("map").getElementById(
                heat[territory].territory
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f ]/g, "")
              ).style.fill = getColorForPercentage(
                (heat[territory].power - maxmin[1].power) /
                  (maxmin[0].power - maxmin[1].power)
              );
              _("map")
                .getElementById(
                  heat[territory].territory
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f ]/g, "")
                )
                .setAttribute("owner", heat[territory].winner);
              _("old-map-owner-info").innerHTML = seasonDayObject(
                season || 1,
                day || 0,
                false,
                "page_leaderboard_update",
                window.turnsObject
              );
              _("old-map-owner-info").setAttribute("selectitem", "true");
            }
            resizeMap();
            regionsNBridgesInit();
            resolve(heat);
          },
          function () {
            reject("Error");
          }
        );
        break;
      case "leaderboard":
        doAjaxGetRequest(
          "/api/heat" + addendum,
          "Heat",
          function (heat_data) {
            heat = JSON.parse(heat_data.response);
            // find maximum
            maxmin = getMaxMin(heat, "power");
            dbg("Maxmin", maxmin);
            for (territory in heat) {
              red =
                (heat[territory].power - maxmin[1].power) /
                  (maxmin[0].power - maxmin[1].power) || 0;
              try {
                _("map").getElementById(
                  heat[territory].territory
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f ]/g, "")
                ).style.fill = getColorForPercentage(red);
                _("map")
                  .getElementById(
                    heat[territory].territory
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f ]/g, "")
                  )
                  .setAttribute("owner", heat[territory].winner);
                _("map")
                  .getElementById(
                    heat[territory].territory
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f ]/g, "")
                  )
                  .setAttribute("power", heat[territory].power);
                _("map")
                  .getElementById(
                    heat[territory].territory
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f ]/g, "")
                  )
                  .setAttribute("players", heat[territory].players);
                _("map")
                  .getElementById(
                    heat[territory].territory
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f ]/g, "")
                  )
                  .setAttribute("mapname", "leaderboard");
                _("old-map-owner-info").innerHTML = seasonDayObject(
                  season || 1,
                  day || 0,
                  false,
                  "page_leaderboard_update",
                  window.turnsObject
                );
                _("old-map-owner-info").setAttribute("selectitem", "true");
              } catch {}
            }
            var li = '<br/><br/><ul id="spot">';
            for (var i = 0, l = 10; i <= l; i++) {
              li +=
                '<li style="background:' +
                getColorForPercentage(i / l) +
                '">' +
                (
                  (i / l) * (maxmin[0].power - maxmin[1].power) +
                  maxmin[1].power
                ).toFixed(0) +
                "</li>";
            }
            li += "</ul>";
            _("map-container").innerHTML += li;
            mapPanInit("#map");
            resizeMap();
            regionsNBridgesInit();
            resolve(heat);
          },
          function () {
            reject("Error");
          }
        );
        break;
      case "territories":
        doAjaxGetRequest(
          "/api/territories" + addendum,
          "Territories",
          function (territory_data) {
            window.territories = JSON.parse(territory_data.response);
            var i = "";
            let len_teams = appInfo.teamsObject.length;
            // Can be used if you want to display images instead of colors
            if (appInfo.settings.map_logos) {
              for (j = 0; j < len_teams; j++) {
                i = appInfo.teamsObject[j]["logo"];
                _("defs208").innerHTML +=
                  '  <pattern id="team_logo_' +
                  appInfo.teamsObject[j]["name"].replace(/\W/g, "") +
                  '" patternUnits="userSpaceOnUse" width="50" height="50"><image href="' +
                  i +
                  '" x="0" y="0" width="100" height="100" /></pattern>';
              }
            }
            //appInfo.Mappt = _('map').createSVGPoint();
            for (territory in window.territories) {
              if (appInfo.settings.map_logos) {
                _("map").getElementById(
                  window.territories[territory].name
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f ]/g, "")
                ).style.fill =
                  "url(#team_logo_" +
                  territories[territory].owner.replace(/\W/g, "") +
                  ")";
              } else {
                _("map").getElementById(
                  window.territories[territory].name
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f ]/g, "")
                ).style.fill = "var(--".concat(
                  territories[territory].owner
                    .replace(/\W/g, "")
                    .concat("-primary)")
                );
              }
              _("map")
                .getElementById(
                  window.territories[territory].name
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f ]/g, "")
                )
                .setAttribute("owner", territories[territory].owner);
              try {
                _("map")
                  .getElementById(
                    window.territories[territory].name
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f ]/g, "")
                  )
                  .setAttribute("region", territories[territory].region_name);
              } catch {
                dbg(`No region for ${window.territories[territory].name}`);
              }
              _("map")
                .getElementById(
                  window.territories[territory].name
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f ]/g, "")
                )
                .setAttribute("mapname", "map");
              _("map")
                .getElementById(
                  window.territories[territory].name
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f ]/g, "")
                )
                .setAttribute("territoryid", territories[territory].id);
              mapPanInit("#map");
            }
            resizeMap();
            regionsNBridgesInit();
            resolve(window.territories);
          },
          function () {
            reject("Error");
          }
        );
        break;
      default:
        break;
    }
  });
}

function mapPanInit(id) {
  appInfo.panZoomMap = svgPanZoom(id, {
    center: true,
    beforePan: beforePan,
    customEventsHandler: {
      haltEventListeners: [
        "touchstart",
        "touchend",
        "touchmove",
        "touchleave",
        "touchcancel",
      ],
      init: function (options) {
        var instance = options.instance,
          initialScale = 1,
          pannedX = 0,
          pannedY = 0;

        // Init Hammer
        // Listen only for pointer and touch events
        this.hammer = Hammer(options.svgElement, {
          inputClass: Hammer.SUPPORT_POINTER_EVENTS
            ? Hammer.PointerEventInput
            : Hammer.TouchInput,
        });

        // Enable pinch
        this.hammer.get("pinch").set({ enable: true });

        // Handle double tap
        this.hammer.on("doubletap", function (ev) {
          instance.zoomIn();
        });

        // Handle pan
        this.hammer.on("panstart panmove", function (ev) {
          // On pan start reset panned variables
          if (ev.type === "panstart") {
            pannedX = 0;
            pannedY = 0;
          }

          // Pan only the difference
          instance.panBy({
            x: ev.deltaX - pannedX,
            y: ev.deltaY - pannedY,
          });
          pannedX = ev.deltaX;
          pannedY = ev.deltaY;
        });

        // Handle pinch
        this.hammer.on("pinchstart pinchmove", function (ev) {
          // On pinch start remember initial zoom
          if (ev.type === "pinchstart") {
            initialScale = instance.getZoom();
            instance.zoomAtPoint(initialScale * ev.scale, {
              x: ev.center.x,
              y: ev.center.y,
            });
          }

          instance.zoomAtPoint(initialScale * ev.scale, {
            x: ev.center.x,
            y: ev.center.y,
          });
        });

        // Prevent moving the page on some devices when panning over SVG
        options.svgElement.addEventListener("touchmove", function (e) {
          e.preventDefault();
        });
      },

      destroy: function () {
        this.hammer.destroy();
      },
    },
  });
  appInfo.panZoomMap.fit();
  appInfo.panZoomMap.center();
  appInfo.panZoomMap.zoom(1);
  appInfo.panZoomMap.zoomAtPoint(0.8, { x: 150, y: -1000 });
}

function drawUserTurnHistory(playerObject) {
  let turnHistoryObject = playerObject.turns;
  let display_headings = ["season", "day", "stars", "team", "territory", "mvp"];

  var obj = {
    // Quickly get the headings
    headings: ["Season", "Day", "Stars", "MVP", "Territory", "Team"],

    // data array
    data: [],
  };

  // Loop over the objects to get the values
  for (var i = 0; i < turnHistoryObject.length; i++) {
    obj.data[i] = [];

    for (var p in turnHistoryObject[i]) {
      if (
        turnHistoryObject[i].hasOwnProperty(p) &&
        display_headings.indexOf(p) != -1
      ) {
        if (p == "territory") {
          obj.data[i].push(
            '<a href="/territory/{{terr}}">{{terr}}</a>'.replace(
              /{{terr}}/gi,
              turnHistoryObject[i][p]
            )
          );
        } else if (p == "team") {
          obj.data[i].push(
            '<a href="/team/{{team}}">{{team}}</a>'.replace(
              /{{team}}/gi,
              turnHistoryObject[i][p]
            )
          );
        } else {
          obj.data[i].push(turnHistoryObject[i][p]);
        }
      }
    }
  }
  try {
    window.datatable.destroy();
  } catch {
    // don't do anything, nor output to table ;)
  } finally {
    window.datatable = new DataTable("#history-table", {
      data: obj,
      columns: obj.columns,
      searchable: false,
      perPageSelect: false,
      footer: false,
      labels: {
        info: "",
      },
    });
  }
}

function drawLeaderboard(season, day) {
  var addendum =
    season > 0 && day > 0 ? `?season=${season}&day=${day}` : "";
  doAjaxGetRequest(
    "/api/stats/leaderboard" + addendum,
    "leaderboard request",
    function (leaderboard_data) {
      let leaderboardObject = JSON.parse(leaderboard_data.response);
      let display_headings = [
        "rank",
        "name",
        "territoryCount",
        "playerCount",
        "mercCount",
        "starPower",
        "efficiency",
      ];

      var obj = {
        // Quickly get the headings
        headings: [
          "Rank",
          "Name",
          "Territories",
          "Team<br/> Players",
          "Mercenaries",
          "Star<br/> Power",
          "Efficiency",
        ],

        // data array
        data: [],
      };

      // Loop over the objects to get the values
      for (var i = 0; i < leaderboardObject.length; i++) {
        obj.data[i] = [];

        for (var p in leaderboardObject[i]) {
          if (
            leaderboardObject[i].hasOwnProperty(p) &&
            display_headings.indexOf(p) != -1
          ) {
            if (p == "name") {
              obj.data[i].push(
                '<a href="/team/' +
                  leaderboardObject[i][p] +
                  "\"><img width='30px' alt='team logo' src='" +
                  leaderboardObject[i]["logo"] +
                  "'/>".concat(leaderboardObject[i][p])
              );
            } else if (p == "efficiency") {
              obj.data[i].push((leaderboardObject[i][p] || 0).toFixed(2));
            } else {
              obj.data[i].push(leaderboardObject[i][p] || 0);
            }
          }
        }
      }

      try {
        window.datatable.destroy();
      } catch {
        // don't do anything, nor output to table ;)
      } finally {
        window.datatable = new DataTable("#leaderboard-table", {
          data: obj,
          columns: obj.columns,
          searchable: false,
          perPage: 50,
          perPageSelect: false,
          footer: false,
          perPage: 20,
          labels: {
            info: "",
          },
        });
        window.datatable.columns().sort(1);
      }
    }
  );
}

function page_leaderboard_update(seasonday) {
  //decouple to ints
  seasonday = seasonday.split(".");
  season = Number(seasonday[0]) || 0;
  day = Number(seasonday[1]) || 0;
  drawLeaderboard(season, day, templateLeaderboard, contentTag, season, day);
  drawMap(dbg, dbg, "leaderboard", season, day);
  let selectOpt = _("day_select").getElementsByTagName("option");
  for (ely = 0; ely < selectOpt.length; ely++) {
    selectOpt[ely].removeAttribute("selected");
  }
  _("day_select").value = season + "." + day;
}

function page_info(contentTag) {
  updateLoaderVisibility();
  var templateInfo = _("templateInfo");
  contentTag.innerHTML += templateInfo.innerHTML;
  dbg(contentTag);
}

function page_settings(contentTag) {
  updateLoaderVisibility();
  var templateInfo = _("settingsBlock");
  var cont = templateInfo.innerHTML;
  contentTag.innerHTML += cont.replace(
    /{{bool:([A-z0-9_]+)}}/g,
    "<select id= 'rr_s_$1' onchange = 'setSetting(\"$1\", \"bool\")'><option value='true'>True</option><option value='false'>False</option></select>"
  );
  for (setting in appInfo.settings) {
    try {
      _(`rr_s_${setting}`).value = appInfo.settings[setting];
    } catch {
      dbg(`Setting not available: ${setting}`);
    }
  }
  dbg(contentTag);
}

function setSetting(setting, type) {
  var value = _(`rr_s_${setting}`).value;
  switch (type) {
    case "bool":
      appInfo.settings[setting] = value == "true" ? true : false;
      break;
    default:
      appInfo.settings[setting] = value;
      break;
  }
  localStorage.setItem("rr_settings", JSON.stringify(appInfo.settings));
}

function page_leaderboard(contentTag) {
  /* objects:
          1. map (heat)
          2. leaderboard

      First, we fetch the heat data for turn
          */
  var templateLeaderboard = _("templateLeaderboard");
  templateLeaderboard = templateLeaderboard.innerHTML;
  var templateMap = _("templateMap");
  templateMap = templateMap.innerHTML;
  contentTag.innerHTML += templateMap;
  contentTag.innerHTML += templateLeaderboard;
  drawLeaderboard(0, 0, templateLeaderboard, contentTag);
  let leaderboard = new Promise((resolve, reject) => {
    getTurns(resolve, reject);
    getTeamInfo(resolve, reject);
  })
    .then(() => {
      return new Promise((resolve, reject) => {
        drawMap(resolve, reject, "leaderboard");
      });
    })
    .then(() => {
      return new Promise((resolve, reject) => {
        setupMapHover(resolve, reject);
      });
    });
}

function page_territory(contentTag, t_object) {
  territory = t_object.name;
  season = t_object.season;
  day = t_object.day;
  contentTag.innerHTML = _("templateTerritoryComplete").innerHTML;
  if (season > 0 && day > 0) {
    //attempt to fetch the data for that day & season
    doAjaxGetRequest(
      "/api/territory/turn?season=" +
        season +
        "&day=" +
        day +
        "&territory=" +
        territory,
      "TerritoryFetch",
      function (territoryData) {
        //Fill the table!
        territoryTurn = JSON.parse(territoryData.response);
        territoryCompleteHeader = _(
          "templateTerritoryCompleteHeader"
        ).innerHTML;
        _("territoryCompleteHeader").innerHTML = territoryCompleteHeader
          .replace(
            /{{TerritoryName}}/,
            decodeURIComponent(territory).replace(
              /(^\w{1})|(\s+\w{1})/g,
              (letter) => letter.toUpperCase()
            )
          )
          .replace(/{{owner}}/, territoryTurn.occupier)
          .replace(/{{winner}}/, territoryTurn.winner);
        let display_headings = ["team", "players", "power", "chance"];
        var obj = {
          // Quickly get the headings
          headings: ["Team", "Players", "Power", "Chance"],

          // data array
          data: [],
        };

        chart = {
          team: [],
          power: [],
          background: [],
          hover: [],
        };

        // Loop over the objects to get the values
        for (var i = 0; i < territoryTurn.teams.length; i++) {
          chart.team.push(territoryTurn.teams[i].team);
          chart.power.push(territoryTurn.teams[i].power);
          chart.background.push(territoryTurn.teams[i].color);
          chart.hover.push(territoryTurn.teams[i].secondaryColor);

          obj.data[i] = [];

          for (var p in territoryTurn.teams[i]) {
            if (
              territoryTurn.teams[i].hasOwnProperty(p) &&
              display_headings.indexOf(p) != -1
            ) {
              if (p == "chance") {
                obj.data[i].push(territoryTurn.teams[i][p].toFixed(2));
              } else if (p == "team") {
                obj.data[i].push(
                  '<a href="/team/{{team}}" >{{team}}</a>'.replace(
                    /{{team}}/gi,
                    territoryTurn.teams[i][p]
                  )
                );
              } else {
                obj.data[i].push(territoryTurn.teams[i][p]);
              }
            }
          }
        }
        try {
          window.datatable.destroy();
        } catch {
          // don't do anything, nor output to table ;)
        } finally {
          window.datatable = new DataTable("#owner-table", {
            data: obj,
            columns: obj.columns,
            searchable: false,
            perPageSelect: false,
            footer: false,
            labels: {
              info: "",
            },
          });
        }
        territoryPie = _("territory-complete-pie");
        Chart.defaults.global.defaultFontColor = "white";
        new Chart(territoryPie, {
          type: "doughnut",
          data: {
            labels: chart.team,
            datasets: [
              {
                label: "Win Odds",
                data: chart.power,
                backgroundColor: chart.background,
                hoverBackgroundColor: chart.hover,
              },
            ],
            font: {
              color: "white",
            },
          },
        });
        let display_headings_players = [
          "team",
          "player",
          "stars",
          "weight",
          "multiplier",
          "power",
        ];
        var obj_players = {
          // Quickly get the headings
          headings: [
            "Team",
            "Player",
            "Stars",
            "Weight",
            "Multiplier",
            "Power",
          ],

          // data array
          data: [],
        };
        for (var i = 0; i < territoryTurn.players.length; i++) {
          obj_players.data[i] = [];

          for (var p in territoryTurn.players[i]) {
            if (
              territoryTurn.players[i].hasOwnProperty(p) &&
              display_headings_players.indexOf(p) != -1
            ) {
              if (p == "team") {
                obj_players.data[i].push(
                  '<a href="/team/{{team}}" >{{team}}</a>'.replace(
                    /{{team}}/gi,
                    territoryTurn.players[i][p]
                  )
                );
              } else if (p == "player") {
                obj_players.data[i].push(
                  '<a href="/player/{{player}}" {{star_style}}>{{star}}{{player}}</a>'
                    .replace(/{{player}}/gi, territoryTurn.players[i][p])
                    .replace(
                      /{{star_style}}/,
                      territoryTurn.players[i]["mvp"]
                        ? 'style="color:var(--theme-accent-1);"'
                        : ""
                    )
                    .replace(
                      /{{star}}/,
                      territoryTurn.players[i]["mvp"] ? "✯" : ""
                    )
                );
              } else {
                obj_players.data[i].push(territoryTurn.players[i][p]);
              }
            }
          }
        }
        try {
          window.datatable2.destroy();
        } catch {
          // don't do anything, nor output to table ;)
        } finally {
          dbg(obj_players);
          window.datatable2 = new DataTable(
            "#territory-complete-players-table",
            {
              data: obj_players,
              columns: obj_players.columns,
              searchable: false,
              perPageSelect: false,
              footer: false,
              labels: {
                info: "",
              },
            }
          );
        }
      },
      dbg
    );
  }
}

function page_territory_cover(contentTag, tname) {
  let territory_history = new Promise((resolve, reject) => {
    getTurns(resolve, reject);
  }).then(() => {
    //get MaxMin
    turn_maxmin = getMaxMin(window.turnsObject, "season");
    max_season = turn_maxmin[0].season;
    //fetch territory's history ;)
    doAjaxGetRequest(
      "/api/territory/history?territory=" + tname + "&season=" + max_season,
      "Territory Cover",
      function (territoryResponse) {
        var templateTerritoryHistory = _("templateTerritoryHistory");
        var box = _("templateTerritoryHistoryBox");
        var str = "";
        territoryHistoryObject = JSON.parse(territoryResponse.response);
        for (obj in territoryHistoryObject.reverse()) {
          var objr = territoryHistoryObject.length - obj - 1;
          str += box.innerHTML
            .replace(/{{day}}/gi, territoryHistoryObject[objr].day)
            .replace(/{{team}}/, territoryHistoryObject[objr].owner)
            .replace(/{{season}}/, territoryHistoryObject[objr].season);
        }
        if (
          typeof territoryHistoryObject[0].territory === "undefined" ||
          territoryHistoryObject[0].territory === null
        ) {
          contentTag.innerHTML = templateTerritoryHistory.innerHTML
            .replace(/{{objs}}/, str)
            .replace(/{{TerritoryName}}/gi, decodeURIComponent(tname));
        } else {
          contentTag.innerHTML = templateTerritoryHistory.innerHTML
            .replace(/{{objs}}/, str)
            .replace(
              /{{TerritoryName}}/gi,
              territoryHistoryObject[0].territory
            ); // use the first element to capitalize if the url requires it. otherwise territoryHistoryObject[objr].day
        }
      },
      dbg
    );
  });
}

function page_index(contentTag) {
  /*objects:
          1. map
          2. userinfo / team info
          3. roll
          */
  var templateMap = _("templateMap");
  var templateRoll = _("templateRoll");
  var templateAnnouncements = _("templateAnnouncements");
  contentTag.innerHTML += templateAnnouncements.innerHTML;
  contentTag.innerHTML += templateMap.innerHTML;
  contentTag.innerHTML += templateRoll.innerHTML;
  let index = Promise.all([new Promise(drawMap), new Promise(getTeamInfo)])
    .then((values) => {
      dbg(values);
    })
    .then(() => {
      return new Promise((resolve, reject) => {
        setupMapHover(resolve, reject);
      });
    })
    .then(() => {
      return new Promise((resolve, reject) => {
        getTurns(resolve, reject);
      });
    })
    .then(() => {
      return new Promise((resolve, reject) => {
        getUserInfo(resolve, reject);
      });
    })
    .then(() => {
      return new Promise((resolve, reject) => {
        if (appInfo.mode == 0) {
          drawActionBoardSheet(resolve, reject);
        } else {
          drawActionBoard(resolve, reject);
        }
      });
    })
    .then(() => {
      return new Promise((resolve, reject) => {
        setUpCounter(resolve, reject);
      });
    })
    .then(() => {
      return new Promise((resolve, reject) => {
        if (typeof appInfo.userObject != "undefined") {
          getAndHighlightMove(resolve, reject);
        }
        _("map-note").style.display = "unset";
        doPoll(false, false);
      });
    })
    .catch((values) => {
      dbg(values);
    });
}

function hideUnselectableTeams(season) {
  Array.from(document.querySelector("#team_select").options).forEach(function (
    option_element
  ) {
    if (
      option_element.getAttribute("season") != season ||
      option_element.value == "Unjoinable Placeholder"
    ) {
      option_element.style.display = "none";
    } else {
      dbg(option_element);
      option_element.style.display = "flex";
    }
  });
}

function drawOddsPage(junk) {
  // get value of team_select
  // get value of day_select and break into season, day
  // show heat map, odds map
  // GET /team/odds?team=Texas&day=1&season=1
  // GET doAjaxGetRequest('/images/map.svg', 'Map', function(data) {
  // add all the chances together to get Expected terrritories,
  var team = _("team_select").value;
  var seasonday = _("day_select").value.split(".");
  var day = seasonday[1];
  var season = seasonday[0];
  //update the team select to only have this season's teams!
  dbg("Season");
  dbg(season);
  hideUnselectableTeams(season);
  _("heat-notif").innerHTML = "Where " + team + " deployed forces";
  _("odds-notif").innerHTML = "Where " + team + " had the highest odds";
  doAjaxGetRequest(
    "/api/team/odds?team=" +
      team.replace("&", "%26") +
      "&day=" +
      day +
      "&season=" +
      season,
    "oddsfetch",
    function (oddsObject) {
      var territory_count = 0;
      var territory_expected = 0;
      var survival_odds = 1;
      oddsObject = JSON.parse(oddsObject.response);
      var obj = {
        // Quickly get the headings
        headings: [
          "Territory",
          "Owner",
          "Winner",
          "MVPs",
          "Players",
          "1✯",
          "2✯",
          "3✯",
          "4✯",
          "5✯",
          "Team<br/> Power",
          "Territory<br/> Power",
          "Chance",
        ],

        // data array
        data: [],
      };
      let player_mm = getMaxMin(oddsObject, "players");
      var chance_max;
      var chance_min;
      for (var i = 0; i < oddsObject.length; i++) {
        if (
          chance_max == null ||
          oddsObject[i]["chance"] > chance_max["chance"]
        )
          chance_max = oddsObject[i];
        if (
          chance_min == null ||
          oddsObject[i]["chance"] < chance_min["chance"]
        )
          chance_min = oddsObject[i];
      }
      let chance_mm = [chance_max, chance_min];
      _("heat-map").innerHTML = window.mapTemplate.replace(
        /id="/gi,
        'id="heatmap_'
      );
      heat_paths = _("heat-map").getElementsByTagName("path");
      for (hp = 0; hp < heat_paths.length; hp++) {
        heat_paths[hp].setAttribute("mapname", "heat");
      }
      _("odds-map").innerHTML = window.mapTemplate.replace(
        /id="/gi,
        'id="oddmap_'
      );
      odds_paths = _("odds-map").getElementsByTagName("path");
      for (op = 0; op < odds_paths.length; op++) {
        odds_paths[op].setAttribute("mapname", "odds");
      }
      for (i in oddsObject) {
        territory_count +=
          oddsObject[i].winner.replace(/\W/g, "") == team.replace(/\W/g, "")
            ? 1
            : 0;
        territory_expected += oddsObject[i].chance;
        survival_odds = survival_odds * (1 - oddsObject[i].chance);
        player_red =
          (oddsObject[i].players - player_mm[1].players) /
            (player_mm[0].players - player_mm[1].players) || 0;
        odds_red =
          (oddsObject[i].chance - chance_mm[1].chance) /
            (chance_mm[0].chance - chance_mm[1].chance) || 0;
        _(
          "heatmap_".concat(
            oddsObject[i].territory
              .normalize("NFD")
              .replace(/[\u0300-\u036f ]/g, "")
          )
        ).style.fill = getColorForPercentage(player_red);
        _(
          "heatmap_".concat(
            oddsObject[i].territory
              .normalize("NFD")
              .replace(/[\u0300-\u036f ]/g, "")
          )
        ).setAttribute("players", oddsObject[i].players);
        _(
          "oddmap_".concat(
            oddsObject[i].territory
              .normalize("NFD")
              .replace(/[\u0300-\u036f ]/g, "")
          )
        ).style.fill = getColorForPercentage(odds_red);
        _(
          "oddmap_".concat(
            oddsObject[i].territory
              .normalize("NFD")
              .replace(/[\u0300-\u036f ]/g, "")
          )
        ).setAttribute("odds", oddsObject[i].chance);
        obj.data.push([
          '<a href="/territory/{{terr}}">{{terr}}</a>'.replace(
            /{{terr}}/gi,
            oddsObject[i]["territory"]
          ),
          '<a href="/team/{{team}}">{{team}}</a>'.replace(
            /{{team}}/gi,
            oddsObject[i]["owner"]
          ),
          '<a href="/team/{{team}}">{{team}}</a>'.replace(
            /{{team}}/gi,
            oddsObject[i]["winner"]
          ),
          '<a href="/player/{{player}}">{{player}}</a>'.replace(
            /{{player}}/gi,
            oddsObject[i]["mvp"]
          ),
          oddsObject[i]["players"],
          oddsObject[i]["starBreakdown"]["ones"],
          oddsObject[i]["starBreakdown"]["twos"],
          oddsObject[i]["starBreakdown"]["threes"],
          oddsObject[i]["starBreakdown"]["fours"],
          oddsObject[i]["starBreakdown"]["fives"],
          oddsObject[i]["teamPower"],
          oddsObject[i]["territoryPower"],
          oddsObject[i]["chance"].toFixed(2),
        ]);
      }
      oddsHeatMapWait();
      // Expose variable to use for testing
      try {
        window.datatable.destroy();
      } catch {
        // don't do anything, nor output to table ;)
      } finally {
        window.datatable = new DataTable("#odds-players-table", {
          data: obj,
          columns: obj.columns,
          searchable: false,
          perPageSelect: false,
          footer: false,
          labels: {
            info: "",
          },
        });
      }

      _("odds-survival").innerHTML =
        Math.floor(100 * (1 - survival_odds)) + "%";
      _("odds-expect").innerHTML = territory_expected.toFixed(2);
      _("odds-actual").innerHTML = territory_count.toFixed(2);
      _("leaderboard-wrapper").style.display = "flex";
      dbg("AC5");
      _("action-container").style.display = "flex";
    }
  );
}

function oddsHeatMapWait() {
  window.timeOutLoopCount = 0;
  window.timeOutLoop = setTimeout(function () {
    if (
      document.getElementById("heatmap_map").contentDocument == null ||
      document.getElementById("oddmap_map").contentDocument == null
    ) {
      initOddHeatMapMove();
      window.timeOutLoop = null;
    } else if (window.timeOutLoopCount > 1000) {
      errorNotif(
        "Map Error",
        "Error: could not load maps. We would appreciate a bug report."
      );
    }
  }, 100);
}

function initOddHeatMapMove() {
  appInfo.panZoomMap = svgPanZoom("#oddmap_map", {
    center: true,
    zoomEnabled: true,
    controlIconsEnabled: true,
    customEventsHandler: {
      haltEventListeners: [
        "touchstart",
        "touchend",
        "touchmove",
        "touchleave",
        "touchcancel",
      ],
      init: function (options) {
        var instance = options.instance,
          initialScale = 1,
          pannedX = 0,
          pannedY = 0;

        // Init Hammer
        // Listen only for pointer and touch events
        this.hammer = Hammer(options.svgElement, {
          inputClass: Hammer.SUPPORT_POINTER_EVENTS
            ? Hammer.PointerEventInput
            : Hammer.TouchInput,
        });

        // Enable pinch
        this.hammer.get("pinch").set({ enable: true });

        // Handle double tap
        this.hammer.on("doubletap", function (ev) {
          instance.zoomIn();
        });

        // Handle pan
        this.hammer.on("panstart panmove", function (ev) {
          // On pan start reset panned variables
          if (ev.type === "panstart") {
            pannedX = 0;
            pannedY = 0;
          }

          // Pan only the difference
          instance.panBy({
            x: ev.deltaX - pannedX,
            y: ev.deltaY - pannedY,
          });
          pannedX = ev.deltaX;
          pannedY = ev.deltaY;
        });

        // Handle pinch
        this.hammer.on("pinchstart pinchmove", function (ev) {
          // On pinch start remember initial zoom
          if (ev.type === "pinchstart") {
            initialScale = instance.getZoom();
            instance.zoomAtPoint(initialScale * ev.scale, {
              x: ev.center.x,
              y: ev.center.y,
            });
          }

          instance.zoomAtPoint(initialScale * ev.scale, {
            x: ev.center.x,
            y: ev.center.y,
          });
        });

        // Prevent moving the page on some devices when panning over SVG
        options.svgElement.addEventListener("touchmove", function (e) {
          e.preventDefault();
        });
      },

      destroy: function () {
        this.hammer.destroy();
      },
    },
    //Uncomment this in order to get Y axis synchronized pan
    //beforePan: function(oldP, newP) { return { y: false } },
  });

  // Expose variable to use for testing
  appInfo.panZoomMap2 = svgPanZoom("#heatmap_map", {
    center: true,
    zoomEnabled: true,
    controlIconsEnabled: true,
    customEventsHandler: {
      haltEventListeners: [
        "touchstart",
        "touchend",
        "touchmove",
        "touchleave",
        "touchcancel",
      ],
      init: function (options) {
        var instance = options.instance,
          initialScale = 1,
          pannedX = 0,
          pannedY = 0;

        // Init Hammer
        // Listen only for pointer and touch events
        this.hammer = Hammer(options.svgElement, {
          inputClass: Hammer.SUPPORT_POINTER_EVENTS
            ? Hammer.PointerEventInput
            : Hammer.TouchInput,
        });

        // Enable pinch
        this.hammer.get("pinch").set({ enable: true });

        // Handle double tap
        this.hammer.on("doubletap", function (ev) {
          instance.zoomIn();
        });

        // Handle pan
        this.hammer.on("panstart panmove", function (ev) {
          // On pan start reset panned variables
          if (ev.type === "panstart") {
            pannedX = 0;
            pannedY = 0;
          }

          // Pan only the difference
          instance.panBy({
            x: ev.deltaX - pannedX,
            y: ev.deltaY - pannedY,
          });
          pannedX = ev.deltaX;
          pannedY = ev.deltaY;
        });

        // Handle pinch
        this.hammer.on("pinchstart pinchmove", function (ev) {
          // On pinch start remember initial zoom
          if (ev.type === "pinchstart") {
            initialScale = instance.getZoom();
            instance.zoomAtPoint(initialScale * ev.scale, {
              x: ev.center.x,
              y: ev.center.y,
            });
          }

          instance.zoomAtPoint(initialScale * ev.scale, {
            x: ev.center.x,
            y: ev.center.y,
          });
        });

        // Prevent moving the page on some devices when panning over SVG
        options.svgElement.addEventListener("touchmove", function (e) {
          e.preventDefault();
        });
      },

      destroy: function () {
        this.hammer.destroy();
      },
    },
  });

  appInfo.panZoomMap.setOnZoom(function (level) {
    appInfo.panZoomMap2.zoom(level);
    appInfo.panZoomMap2.pan(appInfo.panZoomMap.getPan());
  });

  appInfo.panZoomMap.setOnPan(function (point) {
    appInfo.panZoomMap2.pan(point);
  });

  appInfo.panZoomMap2.setOnZoom(function (level) {
    appInfo.panZoomMap.zoom(level);
    appInfo.panZoomMap.pan(appInfo.panZoomMap2.getPan());
  });

  appInfo.panZoomMap2.setOnPan(function (point) {
    appInfo.panZoomMap.pan(point);
  });
}

function page_odds(contentTag) {
  // We just dump the grid and such, then let the user sort out what they want
  contentTag.innerHTML = _("templateOdds").innerHTML;
  doAjaxGetRequest(appInfo.map, "Map", function (data) {
    window.mapTemplate = data.response;
  });
  // we now populate the two lists with options, need a list of teams and a list of turns
  Promise.all([
    new Promise(getTeamInfo),
    new Promise((resolve, reject) => {
      getTurns(resolve, reject);
    }),
  ])
    .then((values) => {
      //make pretty thingy
      str =
        '<select onchange="drawOddsPage(this.value); " name="team_select" id="team_select">';
      maxSeason = 0;
      for (i in values[0]) {
        str +=
          '<option name="team_select" season = "' +
          values[0][i].seasons[0] +
          '" value="' +
          values[0][i].name +
          '">' +
          values[0][i].name +
          "</option>";
        if (values[0][i].seasons[0] > maxSeason) {
          maxSeason = values[0][i].seasons[0];
        }
      }
      _("map-owner-info").innerHTML = seasonDayObject(
        0,
        0,
        (autoup = false),
        "drawOddsPage",
        values[1]
      );
      _("map-owner-teams").innerHTML = str;
      _("map-owner-info").setAttribute("selectitem", "true");
      dbg(values);
      hideUnselectableTeams(maxSeason);
      dbg(values);
    })
    .then(() => {
      return new Promise((resolve, reject) => {
        setupMapHover(resolve, reject);
      });
    });
}

function drawTeamPage(teamsObject, teamTurnsObject, team) {
  var capname = decodeURIComponent(team);
  for (x in teamsObject) {
    dbg(team, teamsObject[x].name);
    if (
      teamsObject[x].name.replace(/\W/g, "").toLowerCase() ==
      capname.replace(/\W/g, "").toLowerCase()
    ) {
      _("team-logo").setAttribute("src", teamsObject[x].logo);
      capname = teamsObject[x].name.replace(/\W/g, "");
      _("team-header").innerHTML = "<h1>" + capname + "</h1>";
      break;
    }
  }

  teamTurnsObject = JSON.parse(teamTurnsObject.response);
  var lastTeamTurn = teamTurnsObject[teamTurnsObject.length - 1];
  _("team-prev-players").innerHTML = "Players: " + lastTeamTurn.players;
  _("team-prev-stars").innerHTML = "Star power: " + lastTeamTurn.starPower;
  let display_headings = [
    "season",
    "day",
    "territories",
    "players",
    "starPower",
    "effectivePower",
  ];

  var power_data = [];

  var player_counts = [[], [], [], [], []];

  var obj = {
    // Quickly get the headings
    headings: [
      "Season",
      "Day",
      "Players",
      "Territories",
      "Star Power",
      "Effective Power",
    ],

    // data array
    data: [],
  };

  // Loop over the objects to get the values
  for (var i = 0; i < teamTurnsObject.length; i++) {
    obj.data[i] = [];
    power_data.push({ x: i, y: teamTurnsObject[i]["players"] });
    player_counts[0].push({
      x: i,
      y: teamTurnsObject[i]["starbreakdown"]["ones"],
    });
    player_counts[1].push({
      x: i,
      y: teamTurnsObject[i]["starbreakdown"]["twos"],
    });
    player_counts[2].push({
      x: i,
      y: teamTurnsObject[i]["starbreakdown"]["threes"],
    });
    player_counts[3].push({
      x: i,
      y: teamTurnsObject[i]["starbreakdown"]["fours"],
    });
    player_counts[4].push({
      x: i,
      y: teamTurnsObject[i]["starbreakdown"]["fives"],
    });
    for (var p in teamTurnsObject[i]) {
      if (
        teamTurnsObject[i].hasOwnProperty(p) &&
        display_headings.indexOf(p) != -1
      ) {
        obj.data[i].push(teamTurnsObject[i][p]);
      }
    }
  }
  //first we fill the charts
  Chart.defaults.global.defaultFontColor = "black";
  var starChart = new Chart(_("star-power-history"), {
    type: "line",
    backgroundColor: "white",
    data: {
      datasets: [
        {
          label: "Star Power",
          data: power_data,
          borderColor: "rgba(255,0,0,0.5)",
          backgroundColor: "rgba(255,0,0,0)",
        },
      ],
    },
    options: {
      scales: {
        xAxes: [
          {
            type: "linear",
            position: "bottom",
            scaleLabel: {
              display: true,
              labelString: "Day",
            },
          },
        ],
        yAxes: [
          {
            scaleLabel: {
              display: true,
              labelString: "Star Power",
            },
          },
        ],
      },
    },
  });
  var playerHistory = new Chart(_("player-history"), {
    type: "line",
    data: {
      datasets: [
        {
          label: "Ones",
          data: player_counts[0],
          borderColor: "rgba(255,0,0,0.5)",
          backgroundColor: "rgba(255,0,0,0)",
        },
        {
          label: "Twos",
          data: player_counts[1],
          borderColor: "rgba(0,255,0,0.5)",
          backgroundColor: "rgba(255,0,0,0)",
        },
        {
          label: "Threes",
          data: player_counts[2],
          borderColor: "rgba(0,0,255,0.5)",
          backgroundColor: "rgba(255,0,0,0)",
        },
        {
          label: "Fours",
          data: player_counts[3],
          borderColor: "rgba(0,255,255,0.5)",
          backgroundColor: "rgba(255,0,0,0)",
        },
        {
          label: "Fives",
          data: player_counts[4],
          borderColor: "rgba(255,0,255,0.5)",
          backgroundColor: "rgba(255,0,0,0)",
        },
      ],
    },
    options: {
      scales: {
        xAxes: [
          {
            type: "linear",
            position: "bottom",
            scaleLabel: {
              display: true,
              labelString: "Day",
            },
          },
        ],
        yAxes: [
          {
            scaleLabel: {
              display: true,
              labelString: "Players",
            },
          },
        ],
      },
    },
  });
  //then we fill the table
  try {
    window.datatable.destroy();
  } catch {
    // don't do anything, nor output to table ;)
  } finally {
    window.datatable = new DataTable("#team-turns-table", {
      data: obj,
      columns: obj.columns,
      searchable: false,
      perPageSelect: false,
      footer: false,
      labels: {
        info: "",
      },
    });
  }
  //then we fill the header

  _("teamPlayerHint").innerHTML =
    '<center><a href = "/team/{{team}}/players"> See all of {{team_c}}\'s players </a></center>'
      .replace(/{{team}}/gi, team)
      .replace(/{{team_c}}/gi, capname);
}

function drawTeamPlayersPage(
  teamsObject,
  teamPlayersObject,
  team,
  turnInclude
) {
  teamPlayersObject = JSON.parse(teamPlayersObject.response);
  let display_headings = ["player", "turnsPlayed"];

  switch (turnInclude) {
    case true:
      headingDef = ["Player", "Turns Played", "Stars", "Last Turn"];
      break;
    case false:
      headingDef = ["Player", "Turns Played", "Stars"];
  }

  var obj = {
    // Quickly get the headings
    headings: headingDef,

    // data array
    data: [],
  };

  for (var i = 0; i < teamPlayersObject.length; i++) {
    obj.data[i] = [];

    for (var p in teamPlayersObject[i]) {
      if (
        teamPlayersObject[i].hasOwnProperty(p) &&
        display_headings.indexOf(p) != -1
      ) {
        if (p == "player") {
          obj.data[i].push(
            '<a href="/player/{{player}}">{{player}}</a>'.replace(
              /{{player}}/gi,
              teamPlayersObject[i][p]
            )
          );
        } else {
          obj.data[i].push(teamPlayersObject[i][p]);
        }
      }
    }
    if (turnInclude) {
      obj.data[i].push(teamPlayersObject[i]["lastTurn"]["stars"]);
      obj.data[i].push(
        "Season: {{s}}, Day: {{d}}"
          .replace(/{{s}}/gi, teamPlayersObject[i]["lastTurn"]["season"])
          .replace(/{{d}}/gi, teamPlayersObject[i]["lastTurn"]["day"])
      );
    } else {
      obj.data[i].push(teamPlayersObject[i]["stars"]);
    }
  }

  dbg(obj);

  try {
    _("team-header").innerHTML =
      "<h1>" + teamPlayersObject[0]["team"] + "</h1>";
  } catch {
    // eh
    dbg("Error with team name.");
  }

  try {
    if (turnInclude) {
      window.datatable.destroy();
    } else {
      window.datatable2.destroy();
    }
  } catch {
    // don't do anything, nor output to table ;)
    dbg("Error with table");
  } finally {
    if (turnInclude) {
      window.datatable = new DataTable("#team-turns-table", {
        data: obj,
        columns: obj.columns,
        searchable: true,
        perPageSelect: false,
        footer: false,
        labels: {
          info: "",
        },
      });
    } else {
      window.datatable2 = new DataTable("#team-mercs-table", {
        data: obj,
        columns: obj.columns,
        searchable: true,
        perPageSelect: false,
        footer: false,
        labels: {
          info: "",
        },
      });
    }
  }
}

function page_team_players(contentTag, team) {
  var templateTeam = _("templateTeamPlayers");
  contentTag.innerHTML += templateTeam.innerHTML;
  _("team-header").innerHTML = "<h1>" + decodeURIComponent(team) + "</h1>";
  var templateTeamPage = _("templateTeamPage");
  let team_page_2 = new Promise((resolve, reject) => {
    getTeamInfo(resolve, reject);
  })
    .then((values) => {
      doAjaxGetRequest(
        "/api/players?team=" + team.replace("&", "%26"),
        "TeamPlayersFetch",
        function (data) {
          drawTeamPlayersPage(values, data, team, true);
        }
      );
    })
    .then((values) => {
      doAjaxGetRequest(
        "/api/mercs?team=" + team.replace("&", "%26"),
        "TeamMercsFetch",
        function (data) {
          drawTeamPlayersPage(values, data, team, false);
        },
        dbg
      );
    });
}

function page_team(contentTag, team) {
  // load the teams info and save to tag
  // /api/stats/team/history
  var templateTeam = _("templateTeam");
  contentTag.innerHTML += templateTeam.innerHTML;
  _("team-header").innerHTML = "<h1>" + decodeURIComponent(team) + "</h1>";
  var templateTeamPage = _("templateTeamPage");
  let team_page_2 = new Promise((resolve, reject) => {
    getTeamInfo(resolve, reject);
  }).then((values) => {
    doAjaxGetRequest(
      "/api/stats/team/history?team=" + team.replace("&", "%26"),
      "TeamFetch",
      function (data) {
        drawTeamPage(values, data, team);
      }
    );
  });
}

function page_regions(contentTag) {
  var templateRegions = _("templateRegions");
  contentTag.innerHTML += templateRegions.innerHTML;
  doAjaxGetRequest(
    "/api/territories",
    "Territories",
    function (territory_data) {
      var obj = {
        // Quickly get the headings
        headings: ["Region", "Territories"],

        // data array
        data: [],
      };
      territory_data = JSON.parse(territory_data.response);
      for (var i = 0; i < territory_data.length; i++) {
        if (
          typeof obj["data"][territory_data[i]["region"] - 1] == "undefined"
        ) {
          obj["data"][territory_data[i]["region"] - 1] = [
            obj["data"][territory_data[i]["region"]],
            [],
          ];
        }
        obj["data"][territory_data[i]["region"] - 1][0] =
          territory_data[i]["region_name"];
        obj["data"][territory_data[i]["region"] - 1][1].push(
          territory_data[i]["name"]
        );
      }
      for (var i = 0; i < obj.data.length; i++) {
        obj["data"][i][1].sort();
        obj["data"][i][1] = obj["data"][i][1].join(", ");
      }
      console.log(obj);
      window.datatable = new DataTable("#region-table", {
        data: obj,
        columns: obj.columns,
        searchable: true,
        perPage: 50,
        perPageSelect: false,
        footer: false,
        labels: {
          info: "",
        },
      });
    },
    function () {
      reject("Error");
    }
  );
}

function page_player(contentTag, pid) {
  //fetch player info
  let leaderboard = new Promise((resolve, reject) => {
    getTeamInfo(resolve, reject);
  });
  var templatePlayerCardWrap = _("templatePlayerCardWrap");
  var templateHistory = _("templateHistory");
  contentTag.innerHTML += templatePlayerCardWrap.innerHTML;
  contentTag.innerHTML += templateHistory.innerHTML;
  doAjaxGetRequest(
    "/api/player?player=" + pid,
    "UserLoader",
    function (playerObject) {
      //Get team
      playerObject = JSON.parse(playerObject.response);
      dbg(playerObject);
      let active_team = playerObject.team || {
        name: null,
      };
      if (active_team.name == null) {
        _("playerCard").innerHTML = "Sorry, user doesn't have a team yet.";
      } else {
        doAjaxGetRequest(
          encodeURI(
            "/api/stats/team?team=".concat(playerObject.team.name)
          ).replace(/&/, "%26"),
          "TeamLoader",
          function (pteamObject) {
            pteamObject = JSON.parse(pteamObject.response);
            drawPlayerCard(playerObject, pteamObject);
            drawUserTurnHistory(playerObject);
          },
          function () {}
        );
      }
    },
    function () {
      _("playerCard").innerHTML = "Hmm, user does not exist";
    }
  );
}

function page_bug() {
  dbg("buggy!");
  if (typeof BrowserInfo === "undefined") {
    var Browserinfo = {
      init: function () {
        this.browser =
          this.searchString(this.dataBrowser) || "An unknown browser";
        this.version =
          this.searchVersion(navigator.userAgent) ||
          this.searchVersion(navigator.appVersion) ||
          "an unknown version";
        this.OS = this.searchString(this.dataOS) || "an unknown OS";
        this.cookies = navigator.cookieEnabled;
        this.language =
          this.browser === "Explorer"
            ? navigator.userLanguage
            : navigator.language;
        this.colors = window.screen.colorDepth;
        this.browserWidth = window.screen.width;
        this.browserHeight = window.screen.height;
        this.java = navigator.javaEnabled() == 1 ? true : false;
        this.codeName = navigator.appCodeName;
        this.cpu = navigator.oscpu;
        this.useragent = navigator.userAgent;
        this.plugins = navigator.plugins;
        this.ipAddress();
      },
      searchString: function (data) {
        for (var i = 0; i < data.length; i++) {
          var dataString = data[i].string;
          var dataProp = data[i].prop;
          this.versionSearchString = data[i].versionSearch || data[i].identity;
          if (dataString) {
            if (dataString.indexOf(data[i].subString) != -1)
              return data[i].identity;
          } else if (dataProp) return data[i].identity;
        }
      },
      searchVersion: function (dataString) {
        var index = dataString.indexOf(this.versionSearchString);
        if (index == -1) return;
        return parseFloat(
          dataString.substring(index + this.versionSearchString.length + 1)
        );
      },

      ipAddress: function () {
        if (
          navigator.javaEnabled() &&
          navigator.appName != "Microsoft Internet Explorer"
        ) {
          vartool = java.awt.Toolkit.getDefaultToolkit();
          addr = java.net.InetAddress.getLocalHost();
          this.host = addr.getHostName();
          this.ip = addr.getHostAddress();
        } else {
          this.host = false;
          this.ip = false;
        }
      },

      screenSize: function () {
        var myWidth = 0,
          myHeight = 0;
        if (typeof window.innerWidth == "number") {
          //Non-IE
          this.browserWidth = window.innerWidth;
          this.browserHeight = window.innerHeight;
        } else if (
          document.documentElement &&
          (document.documentElement.clientWidth ||
            document.documentElement.clientHeight)
        ) {
          //IE 6+ in 'standards compliant mode'
          this.browserWidth = document.documentElement.clientWidth;
          this.browserHeight = document.documentElement.clientHeight;
        } else if (
          document.body &&
          (document.body.clientWidth || document.body.clientHeight)
        ) {
          //IE 4 compatible
          this.browserWidth = document.body.clientWidth;
          this.browserHeight = document.body.clientHeight;
        }
      },
      dataBrowser: [
        {
          string: navigator.userAgent,
          subString: "Chrome",
          identity: "Chrome",
        },
        {
          string: navigator.userAgent,
          subString: "OmniWeb",
          versionSearch: "OmniWeb/",
          identity: "OmniWeb",
        },
        {
          string: navigator.vendor,
          subString: "Apple",
          identity: "Safari",
          versionSearch: "Version",
        },
        {
          prop: window.opera,
          identity: "Opera",
        },
        {
          string: navigator.vendor,
          subString: "iCab",
          identity: "iCab",
        },
        {
          string: navigator.vendor,
          subString: "KDE",
          identity: "Konqueror",
        },
        {
          string: navigator.userAgent,
          subString: "Firefox",
          identity: "Firefox",
        },
        {
          string: navigator.vendor,
          subString: "Camino",
          identity: "Camino",
        },
        {
          // for newer Netscapes (6+)
          string: navigator.userAgent,
          subString: "Netscape",
          identity: "Netscape",
        },
        {
          string: navigator.userAgent,
          subString: "MSIE",
          identity: "Explorer",
          versionSearch: "MSIE",
        },
        {
          string: navigator.userAgent,
          subString: "Gecko",
          identity: "Mozilla",
          versionSearch: "rv",
        },
        {
          // for older Netscapes (4-)
          string: navigator.userAgent,
          subString: "Mozilla",
          identity: "Netscape",
          versionSearch: "Mozilla",
        },
      ],
      dataOS: [
        {
          string: navigator.platform,
          subString: "Win",
          identity: "Windows",
        },
        {
          string: navigator.platform,
          subString: "Mac",
          identity: "Mac",
        },
        {
          string: navigator.userAgent,
          subString: "iPhone",
          identity: "iPhone/iPod",
        },
        {
          string: navigator.platform,
          subString: "Linux",
          identity: "Linux",
        },
      ],
    };
    Browserinfo.init();

    BrowserInfo = {
      os: Browserinfo.OS,
      browser: Browserinfo.browser,
      version: Browserinfo.version,
      cookies: Browserinfo.cookies,
      language: Browserinfo.language,
      browserWidth: Browserinfo.browserWidth,
      browserHeight: Browserinfo.browserHeight,
      java: Browserinfo.java,
      colors: Browserinfo.colors,
      codeName: Browserinfo.codeName,
      host: Browserinfo.host,
      cpu: Browserinfo.cpu,
      useragent: Browserinfo.useragent,
      cookies: document.cookie,
    };
  }

  bug_form = _("bug_form");
  bug_form = bug_form.innerHTML;
  bug_form = bug_form
    .replace(/{{uinf}}/, encodeURI(JSON.stringify(BrowserInfo)))
    .replace(
      /{{errors}}/,
      encodeURI(JSON.stringify(appInfo.errorNotifications))
    )
    .replace(
      /{{pending}}/,
      encodeURI(JSON.stringify(appInfo.outstandingRequests))
    );
  errorNotif(
    "Bug Report",
    bug_form,
    {
      text: "Okay",
      action: function () {
        dbg("Submit");
        window.history.back();
      },
    },
    {
      display: "none",
      action: function () {
        window.history.back();
      },
    }
  );
}

function page_map(content, data = { season: 0, day: 0 }) {
  //collect turninfo if it does not yet exist
  //draw <- Season: # Day: # ->
  //draw map
  //apply filters if requested by user
  var templateMap = _("templateMap");
  templateMap = templateMap.innerHTML;
  content.innerHTML += templateMap;
  let map = new Promise((resolve, reject) => {
    getTurns(resolve, reject);
    getTeamInfo(resolve, reject);
  })
    .then(() => {
      return new Promise((resolve, reject) => {
        drawMap(resolve, reject, "territories", data.season, data.day);
      });
    })
    .then(() => {
      return new Promise((resolve, reject) => {
        setupMapHover(resolve, reject);
        // find the turn element
        const dayId = !(data.season == 0)
          ? window.turnsObject.find(
              (el) => el.season == data.season && el.day == data.day
            ).id
          : window.turnsObject[window.turnsObject.length - 1].id;
        dbg(`dayId: ${dayId}`);
        var tagtemplate = "";
        if (
          typeof window.turnsObject.find((el) => el.id == dayId - 1) !=
          "undefined"
        ) {
          tagtemplate += '<a href="/map/{{pseason}}/{{pday}}">&#11160;</a>'
            .replace(
              /{{pseason}}/,
              window.turnsObject.find((el) => el.id == dayId - 1).season
            )
            .replace(
              /{{pday}}/,
              window.turnsObject.find((el) => el.id == dayId - 1).day
            );
        }
        tagtemplate += "  Season {{season}}, Day {{day}}  "
          .replace(
            /{{season}}/,
            window.turnsObject.find((el) => el.id == dayId).season
          )
          .replace(
            /{{day}}/,
            window.turnsObject.find((el) => el.id == dayId).day
          );
        if (
          typeof window.turnsObject.find((el) => el.id == dayId + 1) !=
          "undefined"
        ) {
          tagtemplate += '<a href="/map/{{nseason}}/{{nday}}">&#11162;</a>'
            .replace(
              /{{nseason}}/,
              window.turnsObject.find((el) => el.id == dayId + 1).season
            )
            .replace(
              /{{nday}}/,
              window.turnsObject.find((el) => el.id == dayId + 1).day
            );
        }
        _("map-day-info").innerHTML = tagtemplate;
        _("old-map-owner-info").style.display = "none";
        _("map-day-info").style.display = "unset";
      });
    });
}

function handleNewPage(title, contentTag, call, vari) {
  /* if (new Date() > appInfo.dDay) {
           clearInterval(window.pulse);
           sky();
       }*/
  contentTag.innerHTML = "";
  appInfo.panZoomMap = null;
  appInfo.lockDisplay = false;
  document.title = "College Football Risk | " + title;
  clearInterval(window.pulse);
  call(contentTag, vari);
  if (appInfo.burgerTrigger) {
    appInfo.burger = false;
    _("nav").style.display = appInfo.burger ? "flex" : "none";
  }
}

function paintPoll() {
  if (appInfo.pollResponses.length == appInfo.pollData.length) {
    //whoop!
    dbg("Okay.");
    //present them with the poll machine!
    askPoll(0);
  } else {
    dbg("Shoot! Couldn't get poll responses.");
  }
}

function askPoll(number) {
  numberp1 = number + 1;
  early = (appInfo.pollData[0].day + 7).toString();
  late = (appInfo.pollData[0].day + 14).toString();
  appInfo.currentPoll = appInfo.pollData[0].id;
  currResp = "Not responded";
  for (j = 0; j < appInfo.pollResponses.length; j++) {
    if (appInfo.pollResponses[j].length > 0) {
      if (appInfo.pollResponses[j][0].response == true) {
        currResp = "Yes";
      } else {
        currResp = "No";
      }
    }
  }
  errorNotif(
    "Polls " + numberp1 + " of " + appInfo.pollData.length,
    appInfo.pollData[0].question +
      //"<br />This would take the season from " +
      //early +
      //" to " +
      //early + " days."+
      " <br/><br/> Your current response is: <b>" +
      currResp +
      " </b><div id='pollResponseError'></div>",
    {
      text: "Yes",
      action: function () {
        doAjaxGetRequest(
          "/auth/poll/respond?poll=" +
            appInfo.currentPoll +
            "&response=" +
            true,
          "Poll Responder",
          function (data) {
            if (data.status == 200) {
              for (ei = 0; ei < appInfo.errorNotifications.length; ei++) {
                if (
                  appInfo.errorNotifications[ei].status == 1 &&
                  appInfo.errorNotifications[ei].title.includes("Poll")
                ) {
                  appInfo.errorNotifications[ei].status = 0;
                  errorOver(ei);
                }
              }
            } else {
              _("pollResponseError").innerHTML =
                '<br/><br/><b style="red">1 Hmm, something went wrong. Try again.</b>';
            }
          },
          function () {
            _("pollResponseError").innerHTML =
              '<br/><br/><b style="red">2 Hmm, something went wrong. Try again.</b>';
          }
        );
      },
    },
    {
      text: "No",
      action: function () {
        doAjaxGetRequest(
          "/auth/poll/respond?poll=" +
            appInfo.currentPoll +
            "&response=" +
            false,
          "Poll Responder",
          function (data) {
            if (data.status == 200) {
              for (ei = 0; ei < appInfo.errorNotifications.length; ei++) {
                if (
                  appInfo.errorNotifications[ei].status == 1 &&
                  appInfo.errorNotifications[ei].title.includes("Poll")
                ) {
                  appInfo.errorNotifications[ei].status = 0;
                  errorOver(ei);
                }
              }
            } else {
              _("pollResponseError").innerHTML =
                '<br/><br/><b style="red">1 Hmm, something went wrong. Try again.</b>';
            }
          },
          function () {
            _("pollResponseError").innerHTML =
              '<br/><br/><b style="red">2 Hmm, something went wrong. Try again.</b>';
          }
        );
      },
    },
    false
  );
}

function doPoll(realize = true, notify = false) {
  doAjaxGetRequest(
    "/auth/polls",
    "Poll Requests",
    function (pollData) {
      try {
        pollData = JSON.parse(pollData.response);
        appInfo.pollData = pollData;
        dbg(pollData);
        appInfo.pollResponses = [];
        dbg("Polling...");
        for (i = 0; i < pollData.length; i++) {
          if (
            realize ||
            (pollData[i].season ==
              window.turnsObject[window.turnsObject.length - 1].season &&
              pollData[i].day ==
                window.turnsObject[window.turnsObject.length - 1].day &&
              getCookie("polled2") != "true")
          ) {
            doAjaxGetRequest(
              "/auth/poll/response?poll=" + pollData[i].id,
              "Poll Response Requests",
              function (data) {
                appInfo.pollResponses.push(JSON.parse(data.response));
                paintPoll();
                document.cookie =
                  "polled2=true; expires=Thu, 23 Jan 2022 12:00:00 UTC; path=/; samesite=lax;";
              },
              function () {
                appInfo.pollResponses.push([]);
                errorNotif(
                  "Error Parsing Polls",
                  "Hmm, appears somebody stole our voter rolls. Try again?",
                  {
                    text: "Okay",
                  },
                  {
                    display: "none",
                  }
                );
              }
            );
          }
        }
      } catch {
        errorNotif(
          "Error Parsing Polls",
          "Hmm, appears somebody stole our voter rolls. Try again?",
          {
            text: "Okay",
          },
          {
            display: "none",
          }
        );
      }
    },
    function () {
      errorNotif(
        "Could Not Fetch Polls",
        "We could not fetch the polls. Try again?",
        {
          text: "Okay",
        },
        {
          display: "none",
        }
      );
    }
  );
}

class Router {
  constructor(options) {
    this.routes = [];

    this.mode = null;

    this.root = "/";
    this.mode = window.history.pushState ? "history" : "hash";
    if (options.mode) this.mode = options.mode;
    if (options.root) this.root = options.root;

    this.add = (path, cb) => {
      this.routes.push({ path, cb });
      return this;
    };

    this.remove = (path) => {
      for (let i = 0; i < this.routes.length; i += 1) {
        if (this.routes[i].path === path) {
          this.routes.slice(i, 1);
          return this;
        }
      }
      return this;
    };

    this.flush = () => {
      this.routes = [];
      return this;
    };

    this.clearSlashes = (path) => path.toString();
    //  .replace(/\/$/, '')
    // .replace(/^\//, '');

    this.getFragment = () => {
      let fragment = "";
      if (this.mode === "history") {
        fragment = this.clearSlashes(
          decodeURI(window.location.pathname + window.location.search)
        );
        dbg(fragment);
        fragment = fragment.replace(/\?(.*)$/, "");
        fragment =
          this.root !== "/" ? fragment.replace(this.root, "") : fragment;
      } else {
        const match = window.location.href.match(/(.*)$/);
        fragment = match ? match[1] : "";
      }
      return this.clearSlashes(fragment);
    };

    this.navigate = (path = "") => {
      if (this.mode === "history") {
        window.history.pushState(
          null,
          null,
          this.root + this.clearSlashes(path)
        );
      } else {
        window.location.href = `${window.location.href.replace(
          /(.*)$/,
          ""
        )}#${path}`;
      }
      return this;
    };

    this.listen = () => {
      clearInterval(this.interval);
      this.interval = setInterval(this.interval, 50);
    };

    this.interval = () => {
      if (
        this.current === this.getFragment() ||
        this.current + "#" === this.getFragment()
      )
        return;
      this.current = this.getFragment();

      this.routes.some((route) => {
        const match = this.current.match(route.path);
        if (match) {
          match.shift();
          route.cb.apply({}, match);
          return match;
        }
        return false;
      });
    };
    this.listen();
  }
}

const router = new Router({
  mode: "hash",
  root: "/",
});

var contentTag = _("content-wrapper");

router
  .add("/leaderboard", () => {
    handleNewPage("Leaderboard", contentTag, page_leaderboard);
  })
  .add("/odds", () => {
    handleNewPage("Odds", contentTag, page_odds);
  })
  .add("/info", () => {
    handleNewPage("Information", contentTag, page_info);
  })
  .add("/settings", () => {
    handleNewPage("Settings", contentTag, page_settings);
  })
  .add(/team\/(.*)\/players/, (team) => {
    handleNewPage(team, contentTag, page_team_players, team.replace("#", ""));
  })
  .add("/team/(.*)", (team) => {
    handleNewPage(team, contentTag, page_team, team.replace("#", ""));
  })
  .add("/territory/(.*)/(.*)/(.*)", (territoryName, season, day) => {
    dbg(territoryName, season, day);
    handleNewPage(territoryName, contentTag, page_territory, {
      name: territoryName,
      season: season.replace("#", ""),
      day: day.replace("#", ""),
    });
  })
  .add("/territory/(.*)", (territoryName) => {
    handleNewPage(
      territoryName,
      contentTag,
      page_territory_cover,
      territoryName
    );
  })
  .add("/map/(.*)/(.*)", (season, day) => {
    dbg(
      "Loading map: season {{season}} day {{day}}"
        .replace(/{{season}}/, season)
        .replace(/{{day}}/, day)
    );
    handleNewPage("Map", contentTag, page_map, {
      season: season.replace("#", ""),
      day: day.replace("#", ""),
    });
  })
  .add("/map", () => {
    dbg("Loading map");
    handleNewPage("Map", contentTag, page_map);
  })
  .add("/bug", () => {
    dbg("Loading Bug Page");
    page_bug();
  })
  .add("/player/(.*)", (pid) => {
    handleNewPage(pid, contentTag, page_player, pid);
  })
  .add("/regions", () => {
    handleNewPage("Regions", contentTag, page_regions);
  })
  .add("/docs/", () => {
    window.location = "/docs/";
  })
  .add("/", () => {
    // general controller
    handleNewPage("Home", contentTag, page_index);
  })
  .add("", () => {
    dbg("404");
  });

/*** UTILITIES ***/

function _(id) {
  return document.getElementById(id);
}

function doDate() {
  0;
  /* if (new Date() > appInfo.dDay) {
              clearInterval(window.pulse);
              sky();
          }*/
  var templateRollInfo = _("templateRollInfo");
  templateRollInfo = templateRollInfo.innerHTML;
  var now = new Date();
  var str = "";
  var difference = appInfo.rollTime - now;
  var days = 0;
  var days = Math.floor(difference / 1000 / 24 / 60 / 60);
  difference -= days * 1000 * 24 * 60 * 60;
  var hours = Math.floor(difference / 1000 / 60 / 60);
  difference -= hours * 1000 * 60 * 60;
  var minutes = Math.floor(difference / 1000 / 60);
  difference -= minutes * 1000 * 60;
  var seconds = Math.floor(difference / 1000);
  difference -= seconds * 1000;
  str += templateRollInfo
    .replace(/{{day}}/, window.turn.day)
    .replace(/{{days}}/, pad(days, "days", false, false, 0))
    .replace(/{{hours}}/, pad(hours, "hours", false, false, days))
    .replace(/{{minutes}}/, pad(minutes, "minutes", true, false, hours + days))
    .replace(
      /{{seconds}}/,
      pad(seconds, "seconds", true, true, minutes + days + hours)
    );
  _("rollInfo").innerHTML = str;
}

function doDate2() {
  var now = new Date();
  var str = "";
  var difference = appInfo.rollTime - now;
  //var days = 0;
  //var days = Math.floor(difference / 1000 / 24 / 60 / 60)
  //difference -= days * 1000 * 24 * 60 * 60;
  var phours = Math.floor(difference / 1000 / 60 / 60);
  if (phours < 0) {
    merry();
  }
  difference -= phours * 1000 * 60 * 60;
  var minutes = Math.floor(difference / 1000 / 60);
  difference -= minutes * 1000 * 60;
  var seconds = Math.floor(difference / 1000);
  difference -= seconds * 1000;
  str =
    pad(phours, "", true, false, 1).slice(0, -2) +
    ":" +
    pad(minutes, "", true, false, 1).slice(0, -2) +
    ":" +
    pad(seconds, "", true, false, 1).slice(0, -2);
  _("big-clock").innerHTML = str;
}

function getAndHighlightMove() {
  dbg("Making request for current move.");
  doAjaxGetRequest("/auth/my_move", "Plotting Pretty Map", function (data) {
    highlightTerritory(data.response.replace(/"/g, ""));
  });
}

function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(";");
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == " ") {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

function getMaxMin(arr, prop) {
  var max;
  var min;
  for (var i = 0; i < arr.length; i++) {
    if (max == null || parseInt(arr[i][prop]) > parseInt(max[prop]))
      max = arr[i];
    if (min == null || parseInt(arr[i][prop]) < parseInt(min[prop]))
      min = arr[i];
  }
  return [max, min];
}

function highlightTerritory(territory) {
  if (!appInfo.settings.hide_move) {
    dbg("Highlighting {{Territory}}".replace(/{{Territory}}/, territory));
    let highlighted = document.getElementsByClassName("map-animated-highlight");
    for (i = 0; i < highlighted.length; i++) {
      highlighted[i].classList.remove("map-animated-highlight");
    }
    _("map").getElementById(
      territory
        .normalize("NFD")
        .replace(/[\u0300-\u036f ]/g, "")
        .replaceAll('"', "")
    ).classList = "map-animated-highlight";
  } else {
    try {
      _("map-note").innerHTML = "";
    } catch {}
    dbg("Not displaying roll");
  }
}

function link_is_external(link_element) {
  return link_element.host !== window.location.host;
}

function pad(number, notion, final, next, prev) {
  if (number != 0 || prev != 0) {
    return (
      (next == true && prev != 0 ? "and " : "") +
      (number < 10 ? "0" : "") +
      number +
      " " +
      notion +
      (final == false ? ", " : " ")
    );
  } else {
    return "";
  }
  if (prev == 0 && number == 0) {
    appInfo.rollTime.setUTCDate(appInfo.rollTime.getUTCDate() + 1);
  }
}

function resizeGlobal() {
  try {
    resizeMap();
  } catch {
    //we're not on the main page. :shrug:
    dbg("Could not resize map. Not on main page.");
  }
}

function setUpCounter(resolve, reject) {
  window.pulse = setInterval(doDate, 1000);
  resolve();
}

var percentColors = [
  { pct: 0.0, color: { r: 0x00, g: 0xff, b: 0 } },
  { pct: 0.5, color: { r: 0xff, g: 0xff, b: 0 } },
  { pct: 1.0, color: { r: 0xff, g: 0x00, b: 0 } },
];
var getColorForPercentage = function (pct) {
  for (var i = 1; i < percentColors.length - 1; i++) {
    if (pct < percentColors[i].pct) {
      break;
    }
  }
  var lower = percentColors[i - 1];
  var upper = percentColors[i];
  var range = upper.pct - lower.pct;
  var rangePct = (pct - lower.pct) / range;
  var pctLower = 1 - rangePct;
  var pctUpper = rangePct;
  var color = {
    r: Math.floor(lower.color.r * pctLower + upper.color.r * pctUpper),
    g: Math.floor(lower.color.g * pctLower + upper.color.g * pctUpper),
    b: Math.floor(lower.color.b * pctLower + upper.color.b * pctUpper),
  };
  return "rgba(" + [color.r, color.g, color.b].join(",") + ",0.5)";
  // or output as hex if preferred
};

/*** Holiday Special ***/
function merry() {
  appInfo.rollTime = new Date("December 26, 2020 04:00:00");
  appInfo.rollTime.setUTCHours(4, 0, 0, 0);

  if (appInfo.rollTime < new Date()) {
    appInfo.rollTime = new Date();
    appInfo.rollTime.setUTCHours(4, 0, 0, 0);
    if (appInfo.rollTime < new Date()) {
      appInfo.rollTime.setUTCDate(appInfo.rollTime.getUTCDate() + 1);
    }
  }
}

function sky() {
  //fade:
  try {
    clearInterval(window.pulse);
    clearTimeout(appInfo.fadeTimer);
    clearTimeout(sky2t);
    clearTimeout(window.pulse2);
  } catch {}
  if (getCookie("seen") == "true") {
    sky2();
  } else {
    appInfo.fullOpacity = 1;
    appInfo.fadeTimer = setInterval(function () {
      appInfo.fullOpacity = appInfo.fullOpacity - 0.1;
      _("reddit-login-top").style.opacity = appInfo.fullOpacity;
      _("nav").style.opacity = appInfo.fullOpacity;
      _("content-wrapper").style.opacity = appInfo.fullOpacity;
      document.getElementsByTagName("footer")[0].style.opacity =
        appInfo.fullOpacity;
      if (appInfo.fullOpacity <= 0) {
        dbg("Exit");
        document.cookie +=
          "seen=true; expires=Thu, 28 Dec 2020 12:00:00 UTC; path=/; samesite=lax;";
        clearInterval(window.pulse);
        clearTimeout(appInfo.fadeTimer);
        clearTimeout(window.pulse2);
        clearTimeout(sky2t);
        var sky2t = setTimeout(sky2, 200);
      }
    }, 200);
  }
}

function sky2() {
  try {
    _("reddit-login-top").style.display = "none";
  } finally {
    _("nav").style.display = "none";
    _("content-wrapper").style.display = "none";
    document.getElementsByTagName("footer")[0].style.display = "none";
    document.getElementsByTagName("body")[0].style.background = "black";
    document.getElementsByTagName("body")[0].innerHTML +=
      '<h1 style="color:var(--theme-accent-1);font-family:digitalClock; font-size:35vh;text-align:center;margin-top:32.5vh;" id="big-clock">00:00:00</h1><h2 style="text-align: center;margin-top: 10vh;"><a href="https://discord.com/invite/KG2sKHg">Join the Discord</a></h2>';
    appInfo.rollTime = new Date("December 26, 2020 04:00:00");
    appInfo.rollTime.setUTCHours(4, 0, 0, 0);

    merry();

    window.pulse2 = setInterval(doDate2, 1000);
  }
}

var beforePan = function (oldPan, newPan) {
  if (appInfo.settings.map_overscroll) {
    return newPan;
  }
  var stopHorizontal = false,
    stopVertical = false,
    gutterWidth = 100,
    gutterHeight = 0,
    // Computed variables
    sizes = this.getSizes(),
    leftLimit =
      -((sizes.viewBox.x + sizes.viewBox.width) * sizes.realZoom) + gutterWidth,
    rightLimit = sizes.width - gutterWidth - sizes.viewBox.x * sizes.realZoom,
    topLimit =
      -((sizes.viewBox.y + sizes.viewBox.height) * sizes.realZoom) +
      gutterHeight,
    bottomLimit =
      sizes.height - gutterHeight - sizes.viewBox.y * sizes.realZoom;

  customPan = {};
  customPan.x = Math.max(leftLimit, Math.min(rightLimit, newPan.x));
  customPan.y = Math.max(topLimit, Math.min(bottomLimit, newPan.y));

  return customPan;
};

// @license-end
