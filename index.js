const express = require('express');
const request = require('request-promise');
const puppeteer = require('puppeteer');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());


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

        let rebounds = getEveryNth(allStats,2)
        let assists = getEveryNth(allStats,3)
        let threePointers = getEveryNth(allStats,9)


        let pStats = [];
        for(p in players) {
            pStats.push(
                {
                    player:players[p],
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
app.get('/',async (req,res)=>{
    res.send('Welcome to the basketball player stats api, by dreasa')
});
app.get('/:matchId',async (req,res)=>{
    const { matchId } = req.params;
    let response;
    try {
        response = await getPStats(matchId);
    }
    catch(error){
        res.json(error)
    }
    finally {
        res.json(response)
    }
});