const fs = require('fs');
const scraperObject = {
	url: 'https://omma.us.thentiacloud.net/webs/omma/register/#/business/search/all/Dispensary',
	async scraper(browser){
        let page = await browser.newPage();
        console.log(`Navigating to ${this.url}...`);
        // Navigate to the selected page
        await page.goto(this.url);

        function delay(time) {
            return new Promise(function(resolve) {
                setTimeout(resolve, time)
            });
        }

        var pages_data = {}; // Construct the main object for all course data
        pages_data['stores'] = []


        // Main Loop - through all pages
        for (var page_index = 0; page_index < 407; page_index++){   
            // Click next page button after first loop iteration
            if (page_index >= 1){
                await page.waitForSelector('button[ng-click="handlePagination(true)"]');
                await page.click('button[ng-click="handlePagination(true)"]');                            
            } else {
                await page.waitForSelector('button[ng-click="handlePagination(true)"]');
            }

            console.log(`loading page ${page_index + 1}`);
            await delay(1000); // Wait for page to fully load
            console.log(`page ${page_index + 1} loaded\n`);
        }

        // var jsonData = JSON.stringify(pages_data, null, 4);
        // // console.log(jsonData);

        // fs.writeFile("output.json", jsonData, 'utf8', function (err) {
        // if (err) {
        //     console.log("An error occured while writing JSON Object to File.");
        //     return console.log(err);
        // }

        // console.log("JSON file has been saved.");
        // })

        await browser.close()
    }
}

module.exports = scraperObject;