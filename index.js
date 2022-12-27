const express = require('express');
const cors = require('cors')
const request = require('request-promise');
const puppeteer = require('puppeteer');
const app = express();
const PORT = process.env.PORT ||5000;

const server = require('http').createServer(app)

app.use(cors());

app.get('/',async (req,res)=>{
    res.send(`select_match`)
});
app.listen(PORT,() => console.log(`server running on ${PORT}`));

function getEveryNth(arr, start) {
    const result = [];

    for (let i = start; i < arr.length; i += 22) {
        result.push(arr[i]);
    }
    return result;
}

async function getPStats(matchId){
    let stats;
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const url = `https://www.flashscore.com/match/${matchId}/#/match-summary/player-statistics/0`
    await page.goto(url);
    await page.waitForSelector('div.playerStatsTable__cell').then( async()=>{
        //get player names
        let players = await page.evaluate(
            ()=> Array
                .from(document.querySelectorAll("div.playerStatsTable__participantNameCell"))
                .map(text=>text.innerText))
        // get player points
        let points = await page.evaluate(
            ()=> Array
                .from(document.querySelectorAll("div.playerStatsTable__cell.playerStatsTable__cell--sortingColumn"))
                .map(text=>text.innerText))
        // get all player stats
        let allStats = await page.evaluate(
            ()=> Array
                .from(document.querySelectorAll("div.playerStatsTable__cell   "))
                .map(text=>text.innerText))

        let team = getEveryNth(allStats,0)
        let rebounds = getEveryNth(allStats,2)
        let assists = getEveryNth(allStats,3)
        let threePointers = getEveryNth(allStats,9)


        let pStats = [];
        for(p in players) {
            pStats.push(
                {
                    matchId,
                    player:players[p],
                    team:team[p],
                    points:points[p],
                    rebounds:rebounds[p],
                    assists:assists[p],
                    threePointers:threePointers[p]
                })
        }
        stats=pStats;

    })
    await browser.close();
    return stats
};

async function getSinglePStats(matchId,selPlayer){
    let stats;
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const url = `https://www.flashscore.com/match/${matchId}/#/match-summary/player-statistics/0`
    await page.goto(url);
    await page.waitForSelector('div.playerStatsTable__cell').then( async()=>{
        //get player names
        let players = await page.evaluate(
            ()=> Array
                .from(document.querySelectorAll("div.playerStatsTable__participantNameCell"))
                .map(text=>text.innerText))
        // get player points
        let points = await page.evaluate(
            ()=> Array
                .from(document.querySelectorAll("div.playerStatsTable__cell.playerStatsTable__cell--sortingColumn"))
                .map(text=>text.innerText))
        // get all player stats
        let allStats = await page.evaluate(
            ()=> Array
                .from(document.querySelectorAll("div.playerStatsTable__cell   "))
                .map(text=>text.innerText))

        let team = getEveryNth(allStats,0)
        let rebounds = getEveryNth(allStats,2)
        let assists = getEveryNth(allStats,3)
        let threePointers = getEveryNth(allStats,9)


        let pStats = [];
        for(p in players) {
            if(players[p]===selPlayer)
                await browser.close();
                let result = [ players[p],points[p],rebounds[p],assists[p],threePointers[p] ];
                return result
        }
        stats=pStats;
    })
    await browser.close();
    return -1;
};

const fs = require('fs');

function saveAsJson(fileName, objectArray) {
    // Add the .json file extension if it is not already included
    if (!fileName.endsWith('.json')) {
        fileName += '.json';
    }

    // Convert the object array to a JSON string
    const json = JSON.stringify(objectArray);

    // Write the JSON string to the specified file
    fs.writeFileSync(fileName, json, err => {
        if (err) throw err;
        console.log('The file has been saved!');
    });
}

async function getBoxScore(matchId) {
    // Import Puppeteer
    const puppeteer = require('puppeteer');

    // Set up the browser and page
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Go to the page
    await page.goto(`https://www.nba.com/game/${matchId}/box-score#box-score`);

    // Select both tables
    const tables = await page.$$('.StatsTable_table__Ejk5X');

    // Set up an empty array to hold the results
    const results = [];
    page.waitForSelector('.MatchupCard_matchup__QjHLw.GameHero_gameHeroMatchUp__y6C2p.GameHero_mdSpace__k4pa5');
    // Select the element with the matchup images
    const matchupElement = await page.$('.MatchupCard_matchup__QjHLw.GameHero_gameHeroMatchUp__y6C2p.GameHero_mdSpace__k4pa5');
    // Get the img elements within the matchup element
    const images = await matchupElement.$$('img');

    // Get the src attributes of the img elements
    const imageSrcs = await Promise.all(
        images.map(async (image) => {
            const src = await image.getProperty('src');
            return src.jsonValue();
        })
    );

    // Loop through the tables
    for (let i = 0; i < tables.length; i++) {
        // Get the rows in the current table
        const rows = await tables[i].$$('tbody tr');

        // Get the header row
        const headerRow = await tables[i].$('thead tr');

        // Get the th elements in the header row
        const headerCells = await headerRow.$$('th');

        // Get the inner text of each th element
        const headerNames = await Promise.all(
            headerCells.slice(1).map(async (cell) => {
                const text = await cell.getProperty('innerText');
                return text.jsonValue();
            })
        );

        // Loop through the rows
        for (let j = 0; j < rows.length - 1; j++) {
            // Check if the row has a child element with the class GameBoxscoreTable_comment__J_Da_
            const hasComment = await rows[j].$('.GameBoxscoreTable_comment__J_Da_');
            let DP;
            if (hasComment) {
                DP = false;
            } else {
                DP = true;
            }
            // Get the player name from the first td element
            const playerNameElement = await rows[j].$('.GameBoxscoreTablePlayer_gbpNameFull__cf_sn');
            const playerName = await playerNameElement.getProperty('innerText');
            const playerNameValue = await playerName.jsonValue();
            // Get the anchor tag in the first td element
            const playerIdElement = await rows[j].$('td:first-of-type a');
            // Get the href attribute of the anchor tag
            const playerId = await playerIdElement.getProperty('href');
            const playerIdValue = await playerId.jsonValue();
            const playerIdNumber = playerIdValue.split('/')[4];

            // Create an object for the row
            const row = { DP, teamId: imageSrcs[i].split('/')[5], playerName: playerNameValue, playerId: playerIdNumber };

            // Add the field names from the header as fields in the object
            headerNames.forEach((name, index) => {
                row[name] = ''; // Set the value to an empty string for now
            });
            const cells = await rows[j].$$('td');

            // Get the inner text of each td element, skipping the first one
            const cellValues = await Promise.all(
                cells.slice(1).map(async (cell) => {
                    const text = await cell.getProperty('innerText');
                    return text.jsonValue();
                })
            );

            // Add the values from the td elements to the object
            cellValues.forEach((value, index) => {
                row[headerNames[index]] = value;
            });

            // Set the fields to 0 if DP is false
            if (!DP) {
                Object.keys(row).forEach((key) => {
                    if (key !== 'DP' && key !== 'playerName' && key !== 'teamId'  && key !== 'playerId') {
                        row[key] = '0';
                    }
                });
            }
            // Add the row to the array
            results.push(row);
        }
    }

    // Close the browser
    await browser.close();
    if (!fs.existsSync('boxscores')) {
        // Create the 'boxscores' folder if it doesn't exist
        fs.mkdirSync('boxscores');
    }
    fs.writeFileSync(`boxscores/${matchId}_boxscore.json`, JSON.stringify(results));

    // Return the results
    return results;
}

getBoxScore('0022200499').then(r=>console.log(r));

async function getTodaysScoreboard() {
    const axios = require('axios');
    const response = await axios.get('https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json');
    const data = response.data;

    // Save the data to a local file
    const fs = require('fs');
    fs.writeFileSync('todaysScoreboard.json', JSON.stringify(data));
}

getTodaysScoreboard().then(()=>console.log('fetched TodaysScoreboard'));

async function getAllNbaPlayerStats(){
    // https://www.nba.com/players
    // let hrefs;
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const url = `https://www.nba.com/players`
    await page.goto(url);
// Wait for the select element to appear on the page
    await page.waitForSelector('select[title="Page Number Selection Drown Down List"]');

    // Get the select element by its title attribute
    // const selectElement = await page.$eval('[title="Page Number Selection Drown Down List"]');
    console.log('through this')
    // Select the option with value -1 from the select element
    // RosterRow_playerName__G28lg
    await page.select('select[title="Page Number Selection Drown Down List"]', '-1');
    await page.waitForSelector('a.RosterRow_playerLink__qw1vG');
        const href = await page.evaluate(
            () => Array.from(
                document.querySelectorAll('a.RosterRow_playerLink__qw1vG'),
                a => a.getAttribute('href')
            )
        )
    await page.waitForSelector('div.RosterRow_playerName__G28lg');
    const firstname = await page.evaluate(
        () => Array.from(
            document.querySelectorAll('div.RosterRow_playerName__G28lg > p.RosterRow_playerFirstName__NYm50'),
            p => p.innerText
        )
    )
    const lastname = await page.evaluate(
        () => Array.from(
            document.querySelectorAll('div.RosterRow_playerName__G28lg > p:not(.RosterRow_playerFirstName__NYm50)'),
            p => p.innerText
        )
    )
    let playersById = [];
    for(let i=0;i<href.length;i++){
        playersById.push({id:href[i].split('/')[2],firstname:firstname[i],lastname:lastname[i],})
    }
    saveAsJson('playersById',playersById)
    await browser.close();
    return playersById
};


let isFetching = false;
let gameDate = '';

async function fetchTodayBoxscores() {
    if (isFetching) return;

    isFetching = true;
    getTodaysScoreboard();
    let res;
    const data = await fs.readFileSync('todaysScoreboard.json');
    res = JSON.parse(data);
    if(res.scoreboard.gameDate!=gameDate){
        emptyBoxscoresFolder();
        gameDate = res.scoreboard.gameDate
    }
    for(let i=0;i<res.scoreboard.games.length;i++){
        console.log(res.scoreboard.games[i].gameId)
        await getBoxScore(res.scoreboard.games[i].gameId)
    }
    isFetching = false;
}
async function emptyBoxscoresFolder() {
    // Import the FS module
    const fs = require('fs');

    // Check if the 'boxscores' folder exists
    if (fs.existsSync('boxscores')) {
        // Read the contents of the 'boxscores' folder
        const files = fs.readdirSync('boxscores');

        // Loop through the files in the folder
        for (const file of files) {
            // Delete the file
            fs.unlinkSync(`boxscores/${file}`);
        }

        // Delete the empty 'boxscores' folder
        fs.rmdirSync('boxscores');
    }
}
setInterval(()=>fetchTodayBoxscores(), 10000)

app.get('/nba-players', async (req, res) => {
    let response;
    try {
         const data = fs.readFileSync('playersById.json');
        response = JSON.parse(data);
    } catch (error) {
        response = { error: error.message };
    }
    res.json(response);
});

app.get('/boxscore/:matchId', (req, res) => {
    const matchId = req.params.matchId;
    const filePath = `boxscores/${matchId}_boxscore.json`;

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.status(404).send('Retry in 10 seconds');
            getBoxScore(matchId);
        } else {
            res.send(JSON.parse(data));
        }
    });
});