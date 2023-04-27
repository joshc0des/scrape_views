const fs = require('fs');
const createCsvWriter = require('csv-writer').createArrayCsvWriter;

const scraperObject = {
	url: 'https://omma.us.thentiacloud.net/webs/omma/register/#/business/search/all/Dispensary',
	async scraper(browser){
        let page = await browser.newPage();
        let extraLinksPage = await browser.newPage();
        console.log(`Navigating to ${this.url}...`);
        // Navigate to the selected page
        await page.goto(this.url);

        function delay(time) {
            return new Promise(function(resolve) {
                setTimeout(resolve, time)
            });
        }

        const csvWriter = createCsvWriter({
			path: 'output.csv',
			header: ['licenseNumber', 'businessName', 'dba', 'licenseType', 'city', 'county', 'licenceExpiration', 'link', 'streetAddress', 'zipCode', 'phone', 'email', 'hours'],
		});

        // Main Data
        for (var page_index = 0; page_index < 1; page_index++){   
            // Click next page button onlyafter first loop iteration
            if (page_index >= 1){
                await page.waitForSelector('button[ng-click="handlePagination(true)"]');
                await page.click('button[ng-click="handlePagination(true)"]');                            
            } else {
                await page.waitForSelector('button[ng-click="handlePagination(true)"]');
            }

            console.log(`loading page ${page_index + 1}`);
            console.log(`page ${page_index + 1} loaded\n`);

            // Extract all rows from the table
            const rows = await page.$$eval('table.table > tbody > tr', (rowElements) => {
                // Map through each row element to extract its information
                return rowElements.map(row => {
                    const licenseNumber = row.querySelector('td:nth-child(1)').innerText.trim();
                    const businessName = row.querySelector('td:nth-child(2)').innerText.trim();
                    const dba = row.querySelector('td:nth-child(2)').innerText.trim();
                    const licenseType = row.querySelector('td:nth-child(3)').innerText.trim();
                    const city = row.querySelector('td:nth-child(4)').innerText.trim();
                    const county = row.querySelector('td:nth-child(5)').innerText.trim();
                    const licenceExpiration = row.querySelector('td:nth-child(6)').innerText.trim();
                    const link = row.querySelector('td:nth-child(7) a').href;
                    // Return an array with all the extracted data
                    return [licenseNumber, businessName, dba, licenseType, city, county, licenceExpiration, link];
                });
            });

            console.log(`Grabbing additional info for page ${page_index + 1}`)
            // Push additional info to rows
            for (const row of rows) {
                //console.log(`Navigating to the info page for ${row[2]}...`);
                await extraLinksPage.goto(`${row[7]}`);
    
                //console.log(`Loading additional data for ${rows[2]}...`);
                await extraLinksPage.waitForXPath('/html/body/div[3]/div/div[2]/div[4]/div/div[2]/a[2]');
                await delay(1000);
                await extraLinksPage.waitForSelector('.col-md-8');
                let values = [];
                while (values.length !== 10) {
                    values = [];
                    values = await extraLinksPage.$$('.col-md-8'); // grabs all additional data
                    // const textValues = [];

                    const textValues = await Promise.all(values.map(async (value) => {
                        const outerText = await value.getProperty('innerText');
                        return await outerText.jsonValue();
                    }));

                    if (textValues.length !== 10) {
                        console.log('Did not find 10 values, retrying...');
                    } else {
                        row.push(textValues[3], textValues[6], textValues[7], textValues[8], textValues[9]);
                    }
                }
                
                console.log(row)
                await delay(5000);
            }                                   

            // Write the extracted data to the CSV file
            csvWriter.writeRecords(rows)
            .then(() => console.log(`***WROTE CSV for PAGE #${page_index + 1}***`));
        }

        await browser.close()
    }
}

module.exports = scraperObject;