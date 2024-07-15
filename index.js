import "@logseq/libs";

// Function to read the content of a file
const readFileContent = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};

// Function to extract information from a French clipping
const parseFrenchClipping = (clipping) => {
  const lines = clipping.split("\n").filter((line) => line.trim() !== "");
  const titleAndAuthor = lines[0].match(/^(.+?)\s\((.+?)\)$/);
  const metaInfo = lines[1].match(
    /- Votre (surlignement|note) sur la page (\d+) \| emplacement (\d+-\d+|\d+) \| Ajouté le (.+)/
  );

  const isNote = /\bnote\b/i.test(lines[1]);

  return {
    title: titleAndAuthor ? titleAndAuthor[1] : "",
    author: titleAndAuthor ? titleAndAuthor[2] : "",
    page: metaInfo ? metaInfo[2] : "",
    location: metaInfo ? metaInfo[3] : "",
    date: metaInfo ? metaInfo[4] : "",
    content: lines.slice(2).join("\n").trim(),
    isNote,
  };
};

// Function to extract information from an English clipping
const parseEnglishClipping = (clipping) => {
  const lines = clipping.split("\n").filter((line) => line.trim() !== "");
  const titleAndAuthor = lines[0].match(/^(.+?)\s\((.+?)\)$/);
  const metaInfo = lines[1].match(
    /- Your (Highlight|Note) on page (\d+) \| Location (\d+-\d+|\d+) \| Added on (.+)/
  );

  const isNote = /\bnote\b/i.test(lines[1]);

  return {
    title: titleAndAuthor ? titleAndAuthor[1] : "",
    author: titleAndAuthor ? titleAndAuthor[2] : "",
    page: metaInfo ? metaInfo[2] : "",
    location: metaInfo ? metaInfo[3] : "",
    content: lines.slice(2).join("\n").trim(),
    isNote,
  };
};

// Function to process all clippings and extract relevant information
const getAllClippings = (clippings) => {
  const infos = [];
  const entries = clippings.split("==========");
  const trimmedEntries = entries
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  let previousHighlight = null;

  trimmedEntries.forEach((entry) => {
    const info = parseEnglishClipping(entry); // Assuming English clippings

    if (info.isNote && previousHighlight) {
      previousHighlight.note = info.content;
    } else if (!info.isNote) {
      // Deduplication based on title, page, location, and part of the content
      const duplicate = infos.find(
        (i) =>
          i.title === info.title &&
          i.page === info.page &&
          i.location === info.location &&
          i.content.substring(0, 50) === info.content.substring(0, 50)
      );

      if (!duplicate) {
        infos.push(info);
        previousHighlight = info;
      }
    }
  });

  return infos;
};

// Function to handle file selection and processing
const handleFileSelection = async () => {
  // Open file picker for text files
  const [fileHandle] = await window.showOpenFilePicker({
    types: [
      {
        description: "Text Files",
        accept: {
          "text/plain": [".txt"],
        },
      },
    ],
    multiple: false,
  });

  if (fileHandle) {
    const file = await fileHandle.getFile();
    const content = await readFileContent(file);
    const clippings = getAllClippings(content);

    for (const clipping of clippings) {
      const pageName = clipping.title;

      // Insert the main content as a new block in the specified page
      const mainBlock = await logseq.Editor.appendBlockInPage(
        pageName,
        clipping.content
      );

      // If a note is present, insert it as a child block of the main block
      if (clipping.note) {
        await logseq.Editor.insertBlock(
          mainBlock.uuid,
          `_Note:_ ${clipping.note}`
        );
      }

      // Insert page information as a child block of the main block
      await logseq.Editor.insertBlock(
        mainBlock.uuid,
        `_Page:_ ${clipping.page}`
      );

      console.log(`Content added to page: ${pageName}`);
    }
  }
};

// Main function to initialize the application
const main = async () => {
  // Register the slash command to read a file
  logseq.Editor.registerSlashCommand("ImportClippings", handleFileSelection);
};

// Initialize the main function and handle any errors
logseq.ready(main).catch(console.error);