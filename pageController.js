const linkScraper = require('./linkScraper');
async function scrapeAll(browserInstance){
	let browser;
	try{
    		browser = await browserInstance;
    		await linkScraper.scraper(browser);

	}
	catch(err){
		console.log("Could not resolve the browser instance => ", err);
	}
}

module.exports = (browserInstance) => scrapeAll(browserInstance)