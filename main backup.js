require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');
const puppeteer = require('puppeteer');
const { text } = require('stream/consumers');
// creating date
var today = new Date();
var rawTime = new Date();
var dd = String(today.getDate()).padStart(2, '0');
var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
var yyyy = today.getFullYear();
today = dd + '-' + mm + '-' + yyyy;
// main variables
const constantLink = 'https://termine.staedteregion-aachen.de/auslaenderamt/';
const defaultTime = 1000;
const multiplier = 4;
// type variables
const regular = {category: 115, buttons: [198, 201, 202], name: "Regular Person"};
const studentFH = {category: 117, buttons: [193], name: "FH Student"};//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of
const studentRWTH = {category: 114, buttons: [191], name: "RWTH Student"};
var externalPersonType = "reg";
// other functions
function delay(time) {
    return new Promise(function(resolve) { setTimeout(resolve, time) });
}

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => ctx.reply('Dear User, this bot can help you get the appointment. To start bot type anything after this message.'));
bot.command('fh', (ctx) => {
    ctx.reply('Hi FH student!');
    externalPersonType = "fh";
    var currentUser = "" + ctx.chat.id;
    findAppointment(bot, currentUser, externalPersonType);
});
bot.on('message', async (ctx) => {
    const response = 'Scan started. Available appointments:';
    var currentUser = "" + ctx.chat.id;
    findAppointment(bot, currentUser, externalPersonType);
    ctx.reply(`${response}`);
});

bot.launch();

// ************************************** MAIN ******************************************************
async function findAppointment(botEntity, currentUserID, externalPersonType){

  const browser = await puppeteer.launch();//{headless: false, slowMo: 100}); // [_][_][_][_][_][_][_][_] );//
  const page = await browser.newPage();
  console.clear();
  console.log('- - - - - NEW SCAN ' + today + ' ID: ' + currentUserID + ' - - - - -');

  switch (externalPersonType){
    case "reg": await personType(regular.category, regular.buttons, regular.name);
        break;
    case "fh": await personType(studentFH.category, studentFH.buttons, studentFH.name);
        break;
    case "rwth": await personType(studentRWTH.category, studentRWTH.buttons, studentRWTH.name);
        break;
  }

  async function personType(categoryID, buttonType, personName) {
        var link = constantLink;
        await page.goto(link);
        await delay(defaultTime);
        
        // pressing buttons section
        [mainPage_FirstOption] = await page.$x('//*[@id="buttonfunktionseinheit-1"]');
        await mainPage_FirstOption.evaluate(mainPage_FirstOption => mainPage_FirstOption.click());
        console.log('p1 done');
        await delay(defaultTime);

        [secondPage_Aufenthalt] = await page.$x('//*[@id="header_concerns_accordion-' + categoryID + '\"]');
        await secondPage_Aufenthalt.evaluate(secondPage_Aufenthalt => secondPage_Aufenthalt.click());
        console.log('p2 dropdown');
        await delay(defaultTime);
        //new team
        for(const element of buttonType){
            [secondPage_T1Plus] = await page.$x('//*[@id="button-plus-' + element + '\"]');
            await secondPage_T1Plus.evaluate(secondPage_T1Plus => secondPage_T1Plus.click());
            console.log('p2 team selected');
            await delay(defaultTime);

            [secondPage_Proceed] = await page.$x('//*[@id="WeiterButton"]');
            await secondPage_Proceed.evaluate(secondPage_Proceed => secondPage_Proceed.click());
            console.log('p2 proceed');
            await delay(defaultTime);

            [secondPage_Popup] = await page.$x('//*[@id="OKButton"]');
            await secondPage_Popup.evaluate(secondPage_Popup => secondPage_Popup.click());
            console.log('p2 popup');
            await delay(defaultTime * multiplier);

            [thirdPage_Location] = await page.$x('//*[@id="ui-id-2"]/form/table/tbody/tr[5]/td/input');
            await thirdPage_Location.evaluate(thirdPage_Location => thirdPage_Location.click());
            console.log('p3 location');
            await delay(defaultTime * multiplier);
            
            console.log("\n" + personName);
            try {
                await page.waitForSelector("#inhalt > div.info > p > strong > span", { timeout: 500 });

                for(let i = 1; i < 15; i++){
                    try{
                        [thirdPage_Result] = await page.$x('//*[@id="ui-id-'+i+'\"]');
                        result = await thirdPage_Result.getProperty('textContent');
                        resultText = await result.jsonValue();
                        if(resultText == "Vorschläge filtern"){
                            i = 15;
                        }
                        else{
                            console.log(resultText);
                            botEntity.telegram.sendMessage(currentUserID, resultText);
                        }
                    }
                    catch(error){
                        console.error('Error: ' + error);
                    }
                }

            } catch (error) {
                console.log("No appointments available");
            }

            [thirdPage_Back] = await page.$x('//*[@id="zurueck"]');
            await thirdPage_Back.evaluate(thirdPage_Back => thirdPage_Back.click());
            console.log('\np3 Zurück');
            await delay(defaultTime);

            [secondPage_Back] = await page.$x('//*[@id="zurueck"]');
            await secondPage_Back.evaluate(secondPage_Back => secondPage_Back.click());
            console.log('p2 Zurück');
            await delay(defaultTime);

            [secondPage_T1Minus] = await page.$x('//*[@id="button-minus-' + element + '\"]');
            await secondPage_T1Minus.evaluate(secondPage_T1Minus => secondPage_T1Minus.click());
            console.log('p2 no team');
            await delay(defaultTime);
        }
      
      return;
  }
  browser.close();
}
// ************************************** MAIN ******************************************************
