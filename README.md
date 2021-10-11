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
- empty all squads (should be online but I'm not sure it's working) 1h
- empty a squad (should be online but I'm not sure it's working) 1h
- remove a player from squad (should be online but I'm not sure it's working) 1h
- starting a record should create a VC for each squad 2h
- clear squads on record stop 1h
- the system should distinguish between death and kill ;) 2h
- react to get in a squad 2h
- react to get in a squad with a class 1h
- annuncements for recruiting 3h
- every change to a squad should stamp the squad 1h

### Features nice to have
- list all players not in a squad 1h
- start recording all type of exp (should be online but it doesn't work) 2h
- the squad has the spot for PL, SL and FL reserved 2h
- every change to a squad should update the message where the squad is listed 2h
- record death, kill, real deaths, resurrection 2h
- send the json/html file when record stops 3h
- upload the html to a website 2h
- get a notification when a continent is locked 3h
- get a notification when an allert start 3h
- get a notification when a base is captured by TDKD 3h
- create alias for members (for other faction char) 3h
- sum the exp gained by player in a record 3h
- add search player function 2h
- add the possibility to change the path for the files folder 3h
- create a ping to the PS2 servers 3h
- create a logger 5h


## Known bug
- json and html files sometimes doesn't have headers 5h
- not every player is tracked 5h
- not every player is found on PS2 API 5h