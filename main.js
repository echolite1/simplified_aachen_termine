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
const regular = {category: 454, buttons: [293, 296, 297], name: "Resident of Aachen"};
const studentFH = {category: 458, buttons: [288], name: "FH Student"}; //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of
const studentRWTH = {category: 455, buttons: [286], name: "RWTH Student"};
var externalPersonType = "reg";
var personalData = {name:"", surname:"", email:"", phone:"", day:"", month:"", year:""}
// other functions
function delay(time) {
    return new Promise(function(resolve) { setTimeout(resolve, time) });
}

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => ctx.reply('Dear User, this bot can help you get the appointment dates in the city of Aachen. \n\nTo start bot - choose the category to subscribe to:\n/resident - for non-student residents\n/fh - for FH Aachen students\n/rwth - for RWTH students\n/rus - чтобы перевести на русский\n/help - to talk to an agent\n\nThis bot is updating the page with available appointments and sending you notifications every 5 minutes'));
bot.command('rus', (ctx) => ctx.reply('Дорогой пользователь, этот бот поможет там получить дату собеседования в городе Аахен. \n\nЧтобы запустить бот, выберите одну из подписок:\n/resident - для обычных жителей\n/fh - для студентов FH Aachen\n/rwth - для студентов RWTH\n/help - чтобы связаться с нашим агентом\n\nЭтот бот присылает доступные даты для собеседований каждые 5 минут'));


bot.command('fh', (ctx) => {
    ctx.reply('Hi FH student!');
    externalPersonType = "fh";
    var currentUser = "" + ctx.chat.id;                     // I am guessing I added "" + to easily transform value to string
    var minutes = 0.4, the_interval = minutes * 60 * 1000;
    setInterval(function() {                                // To remove subscription mode delete this
        findAppointment(bot, currentUser, externalPersonType);
    }, the_interval);
});

bot.command('rwth', (ctx) => {
    ctx.reply('Hi RWTH student!');
    externalPersonType = "rwth";
    var currentUser = "" + ctx.chat.id;
    var minutes = 0.4, the_interval = minutes * 60 * 1000;
    setInterval(function() {
        findAppointment(bot, currentUser, externalPersonType);
    }, the_interval);
});

bot.command('resident', (ctx) => {
    ctx.reply('Hi resident of Aachen!');
    externalPersonType = "reg";
    var currentUser = "" + ctx.chat.id;
    var minutes = 0.8, the_interval = minutes * 60 * 1000;
    setInterval(function() {
        findAppointment(bot, currentUser, externalPersonType);
    }, the_interval);
});

bot.on('message', async (ctx) => {
    const response = 'Bruh. Better type in something smart:/';
    // const response = 'Scan started. Available appointments:';
    var currentUser = "" + ctx.chat.id;
    // findAppointment(bot, currentUser, externalPersonType);
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
        // LOOP begins
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

            [thirdPage_Location] = await page.$x('//*[@id="suggest_location_content"]/form/input[4]');
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
        //LOOP ends
      
      return;
  }
  browser.close();
}
// ************************************** MAIN ******************************************************

            // [proceedToBooking] = await page.$x('//*[@id="panel_1733698800"]/table/tbody/tr/td[2]/form/button');
            // await proceedToBooking.evaluate(proceedToBooking => proceedToBooking.click());
            // console.log('\np4 Time selected');
            // await delay(defaultTime);

            // [proceedToBookingPopup] = await page.$x('//*[@id="TevisDialog"]/div/div/div[3]/button[1]');
            // await proceedToBookingPopup.evaluate(proceedToBookingPopup => proceedToBookingPopup.click());
            // console.log('\np4 Popup OK');
            // await delay(defaultTime);

            // [getCapcha] = await page.$x('?????');
            // await getCapcha.evaluate(getCapcha => getCapcha.??????);
            // console.log('\np4 Popup OK');
            // await delay(defaultTime);