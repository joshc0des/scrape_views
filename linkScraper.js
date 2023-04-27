const fs = require('fs');

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

        const outputFile = 'output.json';
        let data = {
            "total": 0,
            "stores": []
        }

        // Main Loop - FIX # of PAGES with grabbing total from html and dividing by 20 (rounding up)
        for (var page_index = 0; page_index < 144; page_index++){ // for each page of 20 stores
            await page.bringToFront();
            console.log(`loading page ${page_index + 1}`); 

            // Click next page button onlyafter first loop iteration
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
    
                await extraLinksPage.waitForFunction(
                    'document.querySelector("body").innerText.includes("DBA")'
                  );
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
                await delay(500);

                console.log(record)
                await delay(500);

                data.stores.push(record);
                data.total = data.stores.length;
                fs.writeFileSync(outputFile, JSON.stringify(data));
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