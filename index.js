import '@logseq/libs';

const readFileContent = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};


//Inputs 5 numbered blocks when called
async function insertSomeBlocks (e) {
  console.log('Open the calendar!')
  let numberArray = [1, 2, 3, 4, 5]
  for (const number in numberArray){
  logseq.Editor.insertBlock(e.uuid, `This is block ${numberArray[number]}`, {sibling: true})}
  const user = process.env.USER;
  const file = '/home/' + user + '/dev/kindle/myclip.txt';


  logseq.App.registerUIItem('toolbar', {
    key: 'file-reader',
    template: '<button class="button">Read File</button>',
    onClick: async () => {
      const fileHandle = await window.showOpenFilePicker({
        types: [
          {
            description: 'Text Files',
            accept: {
              'text/plain': ['.txt'],
            },
          },
        ],
        multiple: false,
      });

      const file = await fileHandle[0].getFile();
      const content = await readFileContent(file);
      logseq.UI.showMsg(`File Content: ${content.substring(0, 100)}...`);


    },
  });



  // const content = await readFileContent(file);
  // logseq.UI.showMsg(`File Content: ${content.substring(0, 100)}...`);


}


const getInfos = (clipping) => {
  const lines = clipping.split('\n').filter(line => line.trim() !== '');
  const titleAndAuthor = lines[0].match(/^(.+?)\s\((.+?)\)$/);
  const metaInfo = lines[1].match(/- Votre (surlignement|note) sur la page (\d+) \| emplacement (\d+-\d+|\d+) \| Ajouté le (.+)/);
  
  const isNote = /\bnote\b/i.test(lines[1]);

  const title = titleAndAuthor ? titleAndAuthor[1] : '';
  const author = titleAndAuthor ? titleAndAuthor[2] : '';
  const page = metaInfo ? metaInfo[2] : '';
  const location = metaInfo ? metaInfo[3] : '';
  const date = metaInfo ? metaInfo[4] : '';
  const content = lines.slice(2).join('\n').trim();

  return {
      title,
      author,
      page,
      location,
      date,
      content,
      isNote
  };
};

const getENInfos = (clipping) => {
  const lines = clipping.split('\n').filter(line => line.trim() !== '');
  const titleAndAuthor = lines[0].match(/^(.+?)\s\((.+?)\)$/);
  const metaInfo = lines[1].match(/- Your (Highlight|Note) on page (\d+) \| Location (\d+-\d+|\d+) \| Added on (.+)/);
  
  const isNote = /\bnote\b/i.test(lines[1]);

  const title = titleAndAuthor ? titleAndAuthor[1] : '';
  const author = titleAndAuthor ? titleAndAuthor[2] : '';
  const page = metaInfo ? metaInfo[2] : '';
  const location = metaInfo ? metaInfo[3] : '';
  const content = lines.slice(2).join('\n').trim();

  return {
      title,
      author,
      page,
      location,
      content,
      isNote
  };
};

const formatTable = (clippings) => {
  
}

const getAllClippings = (clippings) => {
  const infos = []; 
  const entries = clippings.split('==========');
  const trimmedEntries = entries.map(entry => entry.trim()).filter(entry => entry.length > 0);
  
  let previousHighlight = null;

  trimmedEntries.forEach(entry => {
      const info = getENInfos(entry);
      
      if (info.isNote && previousHighlight) {
          previousHighlight.note = info.content;
      } else if (!info.isNote) {
          // Déduplication basée sur le titre, la page, l'emplacement et une partie du contenu
          const duplicate = infos.find(i => 
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
  

const main = async () => {


  const user = process.env.USER;

  console.log(`User: ${user}`);


  // Définir le chemin du fichier
  const filePath = '/home/' + user + '/dev/kindle/My Clippings.txt';

  // Pour vérifier le chemin automatique si nécessaire
  // const filePath = path.join('/run/media', user, 'Kindle/documents/My Clippings.txt');

  console.log(`Path: ${filePath}`);

  // Initialiser le tableau pour stocker les informations des coupures



  

  
  console.log('plugin loaded');
  logseq.Editor.registerSlashCommand('insertBlocks', async (e) => {
    insertSomeBlocks(e)
  });

  logseq.Editor.registerSlashCommand('ReadFile', async () => {
    const [fileHandle] = await window.showOpenFilePicker({
      types: [
        {
          description: 'Text Files',
          accept: {
            'text/plain': ['.txt'],
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

        // Insérer le contenu principal comme un nouveau bloc
        const mainBlock = await logseq.Editor.appendBlockInPage(pageName, clipping.content);
        
        // Si une note est présente, insérer la note comme enfant du bloc principal
        if (clipping.note) {
          await logseq.Editor.insertBlock(mainBlock.uuid, `_Note:_ ${clipping.note}`);
        }
        await logseq.Editor.insertBlock(mainBlock.uuid, `_Page:_ ${clipping.page}`);

        console.log(`Content added to page: ${pageName}`);
      }
    }
  });
}

  

logseq.ready(main).catch(console.error);
