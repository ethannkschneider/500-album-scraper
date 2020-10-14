import { createArrayCsvWriter } from "csv-writer";
import puppeteer from "puppeteer";
import * as _ from "lodash";

const csvWriter = createArrayCsvWriter({
  path: "./albums.csv",
  header: ["Artist and Title", "Rank"],
});

const BASE_URL =
  "https://www.rollingstone.com/music/music-lists/best-albums-of-all-time-1062063";

type AlbumRankings = Record<string, number>;

const formatAlbumTitle = (title: string): string => {
  return title.replace(/\'/gi, "'");
};

const writeToCsv = async (albums: AlbumRankings): Promise<void> => {
  console.log("writing records to csv...");
  await csvWriter.writeRecords(
    Object.entries(albums).map(([title, rank]) => [
      formatAlbumTitle(title),
      rank,
    ])
  );
  console.log("done writing records to csv");
};

const extractAlbumRankings = async (
  page: puppeteer.Page
): Promise<AlbumRankings> => {
  console.log("in the thing");

  console.log("evaluating page...");
  return await page.evaluate(() => {
    const albums: AlbumRankings = {};
    console.log("getting articles...");
    const articles = Array.from(
      document.querySelectorAll("article.c-gallery-vertical-album")
    );

    let count = 1;
    const total = articles.length;

    articles.forEach((articleEl) => {
      console.log(`processing article number ${count} of ${total}...`);
      count++;
      const rankEl = articleEl.querySelector(
        ".c-gallery-vertical-album__number"
      );
      const rank = parseInt(rankEl?.textContent ?? "") || false;

      if (!rank) {
        console.log("rank not found; skipping...");
        return;
      }

      const titleEl = articleEl.querySelector(
        ".c-gallery-vertical-album__title"
      );
      const title = titleEl?.textContent ?? "";

      if (!title) {
        console.log("title not found; skipping...");
        return;
      }

      albums[title] = rank;
    });
    return albums;
  });
};

const main = async () => {
  console.log("launching browser...");
  const browser = await puppeteer.launch();
  console.log("opening new page...");
  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(0);

  const pages = [
    // BASE_URL,
    // `${BASE_URL}/linda-mccartney-and-paul-ram-1062783`,
    // `${BASE_URL}/arcade-fire-%ef%bb%bffuneral-1062733`,
    // `${BASE_URL}/the-go-gos-beauty-and-the-beat-1062833`,
    // `${BASE_URL}/stevie-wonder-music-of-my-mind-2-1062883`,
    // `${BASE_URL}/shania-twain-come-on-over-1062933`,
    // `${BASE_URL}/buzzcocks-singles-going-steady-2-1062983`,
    // `${BASE_URL}/sade-diamond-life-1063033`,
    // `${BASE_URL}/bruce-springsteen-nebraska-3-1063083`,
    `${BASE_URL}/the-band-music-from-big-pink-2-1063133`,
    `${BASE_URL}/jay-z-the-blueprint-3-1063183`,
  ];

  const albums: AlbumRankings = {};

  for (const url of pages) {
    console.log(`going to url: ${url}...`);
    await page.goto(url);
    await page.waitForSelector("#pmc-gallery-list-nav-bar-render");

    const nextAlbums = _.pickBy(
      await extractAlbumRankings(page),
      (el) => !(el in albums)
    );

    await writeToCsv(nextAlbums);

    Object.assign(albums, nextAlbums);
  }

  console.log("albums:", albums);

  page.on("console", (msg) => {
    try {
      // @ts-ignore
      if (msg._text && msg._text.includes("...")) {
        // @ts-ignore
        console[msg._type]("PAGE LOG:", msg._text);
      }
    } catch (e) {}
  });

  console.log("closing browser...");
  await browser.close();
};

try {
  main().then(() => console.log("done!"));
} catch (e) {
  console.log("Error: ", e);
  process.exit(0);
}
