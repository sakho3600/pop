
function readFile(file, cb) {
    const reader = new FileReader();
    reader.onload = () => {
        cb(reader.result)
    };
    reader.onabort = () => console.log('file reading was aborted');
    reader.onerror = () => console.log('file reading has failed');
    reader.readAsText(file, 'ISO-8859-1');
}

function readXML(file, cb) {
    const reader = new FileReader();
    reader.onload = () => {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(reader.result, "text/xml");
        cb(xmlDoc);
    };
    reader.onabort = () => console.log('file reading was aborted');
    reader.onerror = () => console.log('file reading has failed');
    reader.readAsBinaryString(file);
}


function parseAjoutPilote(res, object) {
    let str = res.replace(/\-\r\n/g, ''); // Parsing du fichier en ajout piloté
    var lines = str.split(/[\r\n]+/g); // tolerate both Windows and Unix linebreaks
    const notices = [];
    let obj = {};
    for (var i = 0; i < lines.length; i++) {
        if (lines[i] === '//') {
            notices.push(obj);
            obj = {};
        } else {
            const key = lines[i];
            let value = '';
            let tag = true;
            while (tag) {
                value += lines[++i];
                if (!(lines[i + 1] && lines[i + 1] !== '//' && (object && !object.has(lines[i + 1])))) {
                    tag = false;
                }
            }
            if (key) {
                obj[key] = value;
            }
        }
    }
    if (Object.keys(obj).length) {
        notices.push(obj);
    }
    return notices;
}



module.exports = {
    readFile,
    readXML,
    parseAjoutPilote,
};

