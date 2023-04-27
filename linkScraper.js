const fs = require('fs');

const scraperObject = {
	url: 'https://omma.us.thentiacloud.net/webs/omma/register/#/business/search/all/Dispensary',
	async scraper(browser){
        let page = await browser.newPage();
        let extraLinksPage = await browser.newPage();
        console.log(`Navigating to ${this.url}...`);

        await page.goto(this.url);

        // this function is a simple delay - mostly used in debugging
        function delay(time) {
            return new Promise(function(resolve) {
                setTimeout(resolve, time)
            });
        }

        // calculates the total amount of pages needed to loop through to get all stores
        async function getTotalPages() {
            const selector = 'span[ng-if="resultCount > 20"]';
            const elementHandle = await page.$(selector);
            if (elementHandle) {
              const textContent = await (await elementHandle.getProperty('textContent')).jsonValue();
              const match = textContent.match(/of\s*(\d+)\s*for/); // grab the total number of stores
                if (match) {
                    const stores = parseInt(match[1]);
                    const pages = Math.ceil(stores / 20);
                    console.log(`\n${pages} total pages of stores ${stores} will be scraped...Starting\n`); // calculated total number of pages
                    return { stores, pages };
                } else {
                    return { error: textContent };
                }
            } else {
              return { error: 'NO HANDLE' };
            }        
        }

        const outputFile = 'output.json';
        let data = {
            "total": 0,
            "stores": []
        }

        await page.bringToFront();
        console.log(`Calculating the number of pages...`);
        await page.waitForSelector('button[ng-click="handlePagination(true)"]');
        await page.waitForSelector('span[ng-if="resultCount > 20"]');

        const pagesStoresCount = await getTotalPages();
        if (pagesStoresCount.stores) {
            console.log(`Stores value: ${pagesStoresCount.stores[1]}`);
            console.log(`Total pages: ${pagesStoresCount.pages}`);
        } else {
            console.log(`Error: ${pagesStoresCount.error}`);
        }
        let storeCounter = 0;
        const storesTotal = pagesStoresCount.stores; // num of stores scraped
        const pagesTotal = pagesStoresCount.pages;

        // Main Loop
        for (var page_index = 0; page_index < pagesTotal; page_index++){ // for each page of 20 stores
            await page.bringToFront();
            console.log(`loading page ${page_index + 1}`); 

            // Click next page button only after first loop iteration
            if (page_index >= 1){
                await page.waitForSelector('button[ng-click="handlePagination(true)"]');
                await page.click('button[ng-click="handlePagination(true)"]');                            
            } else {
                await page.waitForSelector('button[ng-click="handlePagination(true)"]');
            }

            console.log(`page ${page_index + 1} loaded\n`);
            
            // Extract all rows from the table
            const rows = await page.$$eval('table.table > tbody > tr', (rowElements) => {
                // Map through each row element to extract its information
                return rowElements.map(row => {
                    const businessNameCell = row.querySelector('td:nth-child(2)');
                    const businessName = businessNameCell.querySelector('strong').innerText.trim();
                    const dba = businessNameCell.innerText.trim().replace(businessName, '').replace('Trade Name:', '').trim();
                    return {
                        licenseNumber: row.querySelector('td:nth-child(1)').innerText.trim(),
                        businessName,
                        dba,
                        licenseType: row.querySelector('td:nth-child(3)').innerText.trim(),
                        city: row.querySelector('td:nth-child(4)').innerText.trim(),
                        county: row.querySelector('td:nth-child(5)').innerText.trim(),
                        licenceExpiration: row.querySelector('td:nth-child(6)').innerText.trim(),
                        link: row.querySelector('td:nth-child(7) a').href,
                        streetAddress: "",
                        zipCode: "",
                        phone: "",
                        email: "",
                        hours: ""
                      };
                });
            });

            await extraLinksPage.bringToFront();
            console.log(`Grabbing additional info for page ${page_index + 1}`)
            // Push additional info to rows
            for (const record of rows) {
                console.log(`Navigating to the info page for ${record.businessName}...`);
                await extraLinksPage.goto(`${record.link}`);
    
                await extraLinksPage.waitForFunction('document.querySelector("body").innerText.includes("DBA")');
                const profileContainer = await extraLinksPage.$('.hd-box-container.profile');
                const streetAddress = await getRowSpanValue(profileContainer, 'Street Address:');
                const zipCode = await getRowSpanValue(profileContainer, 'ZIP Code:');
                const phone = await getRowValue(profileContainer, 'Telephone Number:');
                const email = await getRowValue(profileContainer, 'E-mail:');
                const hours = await getRowValue(profileContainer, 'Hours of Operation:');
                record.streetAddress = streetAddress;
                record.zipCode = zipCode;
                record.phone = phone;
                record.email = email;
                record.hours = hours;

                data.stores.push(record);
                data.total = data.stores.length;
                fs.writeFileSync(outputFile, JSON.stringify(data));
                storeCounter ++;
                console.log(`Saved ${storeCounter} of ${storesTotal} stores.`)
            }   

            // Works for phone/email/hours NOT street/zip
            async function getRowValue(profileContainer, label) {
                const selector = `//label[contains(text(), "${label}")]/following-sibling::div`;
                const element = await profileContainer.$x(selector);
                if (element.length > 0) {
                    const value = await (await element[0].getProperty('textContent')).jsonValue();
                    return value.trim();
                }
                return '';
            }
            
            // Works for street/zip NOT phone/email/hours
            async function getRowSpanValue(profileContainer, label) {
                const selector = `//label[./span[contains(text(), "${label}")]]/following-sibling::div`;
                const element = await profileContainer.$x(selector);
                if (element.length > 0) {
                  const value = await (await element[0].getProperty('textContent')).jsonValue();
                  return value.trim();
                }
                return '';
            }            
        }

        await browser.close()
    }
}

module.exports = scraperObject;