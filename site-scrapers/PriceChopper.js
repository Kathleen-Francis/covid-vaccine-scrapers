const sites = require("../data/sites.json");
const https = require("https");
const { platform } = require("os");

module.exports = async function GetAvailableAppointments(browser) {
    const siteName = 'PriceChopper';
    console.log(`${siteName} starting`);
    const webData = await ScrapeWebsiteData(browser);
    console.log(`${siteName} done`);
    return sites[siteName].locations.map((loc, i) => {
        const responseLocation = webData[i];
        let hasAvailability = false;
        let availability = {};
        if(responseLocation && responseLocation.visibleTimeSlots) {
            hasAvailability = responseLocation.visibleTimeSlots.length ? true : false;
            for(let [i, timeSlot] of responseLocation.visibleTimeSlots.entries()) {
                let date = timeSlot.time.split('T')[0];
                if(!availability[date]){
                    availability[date] = {
                        hasAvailability: true,
                        numberAvailableAppointments: 0,
                        signUpLink: sites[siteName].signUpLink
                    };
                }
                availability[date].numberAvailableAppointments += 1;
            }
        }
        return {
            name: `Price Chopper (${loc.city})`,
            hasAvailability,
            availability,
            signUpLink: sites.PriceChopper.signUpLink, // or https://pdhi.queue-it.net/?c=pdhi&e=covid19vaccination&t_portalUuid=3e419790-81a3-4639-aa08-6bd223f995df
            ...loc,
        };
    });
};

async function ScrapeWebsiteData(browser) {
    const rawData = [];
    let alreadyFound = function(responseLocation){
        for (let [i , loc] of rawData.entries()) {
            if(responseLocation.address1 == loc.address){
                console.log(`alreadyFound ${responseLocation.address1}`);
                return true;
            }
        }
        return false;
    }
    for (let [i , loc] of sites.PriceChopper.locations.entries()) {
        let url = [
            sites.PriceChopper.websiteRoot,
            loc.zip
        ].join('/') + '?state=' + loc.state;
        const getUrl = new Promise((resolve) => {
            let response = "";
            https.get(url, (res) => {
                let body = "";
                res.on("data", (chunk) => {
                    body += chunk;
                });
                res.on("end", () => {
                    response = JSON.parse(body);
                    resolve(response);
                });
            });
        });
        let responseJson = await getUrl;
        for (let [resI , responseLocation] of responseJson.entries()) {
            if(!alreadyFound(responseLocation)){
                rawData[i] = responseLocation;
            }
        }
    };
    return rawData;
}
