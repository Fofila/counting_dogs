# Counting dogs
Counting dogs (CD) is a discord bot developed for the Drunken Dogs (TDKD), a Planetside 2 outfit.
CD is meant to be used by the higher member of the outfit to manage ops signup and for the members for traking their stats.
It speaks via API with PlanetSide 2 to get the information needed.

## How to setup
1. download the repo
2. run "npm install"
3. setup .env variables
4. "npm start" and you're done
##  Features
### Features online
- join a squad
- leave a squad
- list players in a squad
- list every squad with their players
- create a squad
- remove a squad
- add a player to squad
- start recording
- stop recording
- saving records on html and json file

### Features for the MVP
- empty all squads (should be online but I'm not sure it's working)
- empty a squad (should be online but I'm not sure it's working)
- remove a player from squad (should be online but I'm not sure it's working)
- starting a record should create a VC for each squad
- clear squads on record stop
- the system should distinguish between death and kill ;)
- react to get in a squad
- react to get in a squad with a class
- annuncements for recruiting
- every change to a squad should stamp the squad

### Features nice to have
- list all players not in a squad
- start recording all type of exp (should be online but it doesn't work)
- the squad has the spot for PL, SL and FL reserved
- every change to a squad should update the message where the squad is listed
- record death, kill, real deaths, resurrection
- send the json/html file when record stops
- upload the html to a website
- get a notification when a continent is locked
- get a notification when an allert start
- get a notification when a base is captured by TDKD
- create alias for members (for other faction char)
- sum the exp gained by player in a record
- add search player function
- add the possibility to change the path for the files folder
- create a ping to the PS2 servers
- create a logger


## Known bug
- json and html files sometimes doesn't have headers
- not every player is tracked
- not every player is found on PS2 API