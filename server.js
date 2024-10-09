const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { ChatGroq } = require('@langchain/groq');
const { ChatPromptTemplate } = require("@langchain/core/prompts");

const app = express();
const port = 3000;

// Use body-parser middleware to handle form submissions
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (e.g., HTML, CSS, etc.)
app.use(express.static('public'));

// Route to serve the main page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Route to handle form submissions and scrape the URL
app.post('/fetch', async (req, res) => {
  let url = req.body.url;
  if (!url) {
    return res.send('Please provide a valid URL.');
  }

  // Add https:// prefix if the URL starts with www but not with https
  if (url.startsWith('www')) {
    url = 'https://' + url;
  }

  try {
    // Conditional require statements based on environment
    let browser;

    if (process.env.NODE_ENV === 'production') {
      const chromium = require('chrome-aws-lambda');
      const puppeteer = require('puppeteer-core');
    
      browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath,
        headless: chromium.headless,
      });
    } else {
      const puppeteer = require('puppeteer');
    
      browser = await puppeteer.launch({
        headless: true, // Enable headless mode locally
      });
    }
    
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Extract text, links, and text with links
    const pageContent = await page.evaluate(() => {
      const text = document.body.innerText;
      const links = Array.from(new Set(Array.from(document.querySelectorAll('a')).map(link => link.href)));
      const textWithLinks = Array.from(document.querySelectorAll('a')).map(link => `${link.innerText}: ${link.href}`).join('\n');
      return { text, links, textWithLinks };
    });

    await browser.close();

    let summary = 'Summary not available.';
    try {
      // Use ChatGroq to generate a summary of the scraped text
      const model = new ChatGroq({
        apiKey: "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",
      });

      const promptTemplate = ChatPromptTemplate.fromTemplate(
        "You are an assistant specialized in text summarization. Summarize the following text, focusing on the main points and key details in 200-300 words: {input}"
      );

      const truncatedText = pageContent.text.slice(0, 3000); // Truncate to 3000 characters for better handling
      const chain = promptTemplate.pipe(model);
      const data = await chain.invoke({ input: truncatedText });

      if (data && data.content) {
        summary = data.content;
      } else {
        console.error('Unexpected response format from ChatGroq:', data);
        summary = 'Could not generate summary due to an unexpected response format.';
      }
    } catch (summaryError) {
      console.error('Error generating summary:', summaryError.message);
      summary = 'Could not generate summary due to an error with the summarization service.';
    }

    // Send the extracted content as response
    res.send(`
      <div style="max-width: 100%; padding: 20px;">
        <h1>Scraped Content from ${url}</h1>
        <h2>Summary of Text Content with AI:</h2>
        <pre style="white-space: pre-wrap; word-wrap: break-word; max-width: 100%;">${summary}</pre>
        <h2>Text Content:</h2>
        <pre style="white-space: pre-wrap; word-wrap: break-word; max-width: 100%;">${pageContent.text}</pre>
        <h2>Links:</h2>
        <ul style="max-width: 100%; word-wrap: break-word;">
          ${pageContent.links.map(link => `<li><a href="${link}">${link}</a></li>`).join('')}
        </ul>
        <h2>Text with Links:</h2>
        <pre style="white-space: pre-wrap; word-wrap: break-word; max-width: 100%;">${pageContent.textWithLinks}</pre>
        <a href="/">Back to Home</a>
      </div>
    `);

  } catch (error) {
    console.error(error);
    res.send(error.message);
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

// Step 2: Setting up the Frontend (index.html)
// Create a folder named "public" in the root directory and add the following file "index.html" inside it.
/*
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>URL Scraper</title>
  </head>
  <body>
    <h1>Enter a URL to Scrape</h1>
    <form action="/fetch" method="POST">
      <input type="text" name="url" placeholder="Enter a valid URL" required>
      <button type="submit">Fetch Content</button>
    </form>
  </body>
  </html>
*/

